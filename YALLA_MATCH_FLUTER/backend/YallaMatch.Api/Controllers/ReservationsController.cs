using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using QRCoder;
using YallaMatch.Api.Contracts;
using YallaMatch.Api.Data;
using YallaMatch.Api.Entities;
using YallaMatch.Api.Security;

namespace YallaMatch.Api.Controllers;

[ApiController]
[Route("api/reservations")]
public sealed class ReservationsController(
    YallaMatchDbContext db, 
    IWebHostEnvironment env,
    Microsoft.AspNetCore.SignalR.IHubContext<YallaMatch.Api.Hubs.ScheduleHub> hubContext,
    YallaMatch.Api.Services.INotificationService notifications) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> GetReservations()
    {
        var reservations = await db.Reservations
            .AsNoTracking()
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync();

        return Ok(reservations.Select(ReservationDto.From));
    }

    [HttpGet("mine")]
    [EnableRateLimiting("customer-read")]
    public async Task<IActionResult> GetMyReservations()
    {
        if (!CustomerSessions.TryGetHash(Request, out var sessionHash)) return Unauthorized();

        var reservations = await db.Reservations
            .AsNoTracking()
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .Where(r => r.CustomerSessionId == sessionHash)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync();

        return Ok(reservations.Select(CustomerReservationDto.From));
    }

    [HttpPost]
    [EnableRateLimiting("booking")]
    public async Task<IActionResult> CreateReservation(CreateReservationRequest request)
    {
        if (!CustomerSessions.TryGetHash(Request, out var sessionHash)) return Unauthorized();
        if (!IsValidSlot(request.Date, request.FromHour, request.ToHour))
            return BadRequest("Use a valid date and hours from 0 to 23.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var court = await db.Courts.FirstOrDefaultAsync(c => c.Id == request.CourtId && c.IsActive);
        if (court is null) return NotFound("Court not found.");

        if (IsExpiredSlot(request.Date, request.FromHour)) return Conflict("Selected time has already started.");

        var overlaps = await db.Reservations.AnyAsync(r =>
            r.CourtId == request.CourtId &&
            r.Date == request.Date &&
            r.Status != ReservationStatus.Rejected &&
            r.Status != ReservationStatus.Cancelled &&
            (r.Status == ReservationStatus.Confirmed || (r.Status == ReservationStatus.AwaitingPaymentScreenshot && r.CreatedAtUtc >= DateTimeOffset.UtcNow.AddMinutes(-10))) &&
            request.FromHour <= r.ToHour &&
            request.ToHour >= r.FromHour);

        if (overlaps) return Conflict("Selected time is unavailable.");

        var blocked = await db.CourtSlotBlocks.AnyAsync(s =>
            s.CourtId == request.CourtId &&
            s.Date == request.Date &&
            request.FromHour <= s.ToHour &&
            request.ToHour >= s.FromHour);
        if (blocked) return Conflict("Selected time is unavailable.");

        var reservation = new Reservation
        {
            CourtId = request.CourtId,
            CustomerSessionId = sessionHash,
            CustomerName = request.CustomerName,
            CustomerPhone = request.CustomerPhone,
            Date = request.Date,
            FromHour = request.FromHour,
            ToHour = request.ToHour,
            Price = court.Price * (request.ToHour - request.FromHour + 1),
            Source = BookingSource.Online,
            Status = ReservationStatus.AwaitingPaymentScreenshot,
            PaymentStatus = PaymentStatus.NotUploaded
        };

        reservation.QrToken ??= Codes.NewQrToken(reservation.Id);
        reservation.TrackingCode ??= Codes.NewTrackingCode();

        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        _ = hubContext.Clients.All.SendAsync("SlotStatusChanged", new
        {
            CourtId = court.Id.ToString(),
            Date = request.Date,
            FromHour = request.FromHour,
            ToHour = request.ToHour,
            Status = "Held",
            Reason = "10-Minute Hold",
            TimestampUtc = DateTimeOffset.UtcNow
        });

        if (!string.IsNullOrWhiteSpace(request.CustomerPhone))
        {
            _ = notifications.SendPaymentReminderAsync(request.CustomerPhone, reservation.TrackingCode, 10);
        }

        reservation.Court = court;
        return Created($"/api/reservations/{reservation.Id}", CustomerReservationDto.From(reservation));
    }

    private static bool IsExpiredSlot(string date, int hour)
    {
        var now = DateTimeOffset.Now;
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var slotDate))
            return false;

        var today = DateOnly.FromDateTime(now.DateTime);
        return slotDate < today || (slotDate == today && hour <= now.Hour);
    }

    private static bool IsValidSlot(string date, int fromHour, int toHour) =>
        DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _) &&
        fromHour is >= 0 and <= 23 && toHour >= fromHour && toHour <= 23;

    [HttpPost("{id:guid}/payment-confirmation")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ImageUploads.MaxImageSizeBytes)]
    [EnableRateLimiting("uploads")]
    public async Task<IActionResult> UploadPaymentConfirmation(Guid id, [FromForm(Name = "screenshot")] IFormFile? screenshot)
    {
        if (!CustomerSessions.TryGetHash(Request, out var sessionHash)) return Unauthorized();
        if (!ImageUploads.TryValidate(screenshot, out var contentType, out var extension, out var validationError))
            return BadRequest(validationError);

        var reservation = await db.Reservations
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (reservation is null) return NotFound();
        if (!CustomerSessions.Matches(reservation.CustomerSessionId, sessionHash)) return Forbid();

        byte[] imageBytes;
        await using (var memoryStream = new MemoryStream())
        {
            await screenshot!.CopyToAsync(memoryStream);
            imageBytes = memoryStream.ToArray();
        }

        var base64DataUri = $"data:{contentType};base64,{Convert.ToBase64String(imageBytes)}";

        var confirmation = reservation.PaymentConfirmation;
        if (confirmation is null)
        {
            confirmation = new PaymentConfirmation
            {
                ReservationId = reservation.Id,
                ScreenshotPath = base64DataUri,
                Status = PaymentStatus.PendingVerification
            };
            db.PaymentConfirmations.Add(confirmation);
        }
        else
        {
            DeletePrivatePaymentFile(confirmation.ScreenshotPath);
            confirmation.ScreenshotPath = base64DataUri;
            confirmation.Status = PaymentStatus.PendingVerification;
            confirmation.ReviewedAtUtc = null;
            confirmation.RejectionReason = null;
            confirmation.UploadedAtUtc = DateTimeOffset.UtcNow;
        }

        reservation.PaymentStatus = PaymentStatus.PendingVerification;
        reservation.PaymentConfirmation = confirmation;

        await db.SaveChangesAsync();
        return Ok(CustomerReservationDto.From(reservation));
    }

    [HttpPost("{id:guid}/customer")]
    public async Task<IActionResult> UpdateReservationCustomer(Guid id, [FromBody] UpdateReservationCustomerRequest request)
    {
        if (!CustomerSessions.TryGetHash(Request, out var sessionHash)) return Unauthorized();
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (reservation is null) return NotFound();
        if (!CustomerSessions.Matches(reservation.CustomerSessionId, sessionHash)) return Forbid();

        // Verify if the slot has been booked by someone else in the meantime
        var overlaps = await db.Reservations.AnyAsync(r =>
            r.Id != id &&
            r.CourtId == reservation.CourtId &&
            r.Date == reservation.Date &&
            r.Status != ReservationStatus.Rejected &&
            r.Status != ReservationStatus.Cancelled &&
            (r.Status == ReservationStatus.Confirmed || (r.Status == ReservationStatus.AwaitingPaymentScreenshot && r.CreatedAtUtc >= DateTimeOffset.UtcNow.AddMinutes(-10))) &&
            reservation.FromHour <= r.ToHour &&
            reservation.ToHour >= r.FromHour);

        if (overlaps) return Conflict("Selected time is no longer available.");

        var blocked = await db.CourtSlotBlocks.AnyAsync(s =>
            s.CourtId == reservation.CourtId &&
            s.Date == reservation.Date &&
            reservation.FromHour <= s.ToHour &&
            reservation.ToHour >= s.FromHour);

        if (blocked) return Conflict("Selected time is no longer available.");

        reservation.CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? null : request.CustomerName.Trim();
        reservation.CustomerPhone = string.IsNullOrWhiteSpace(request.CustomerPhone) ? null : request.CustomerPhone.Trim();
        
        // Officially lock the slot now that booking is confirmed
        reservation.Status = ReservationStatus.PendingPaymentVerification;
        
        await db.SaveChangesAsync();

        return Ok(CustomerReservationDto.From(reservation));
    }

    [HttpGet("{id:guid}/qr.svg")]
    [EnableRateLimiting("customer-read")]
    public async Task<IActionResult> GetQrSvg(Guid id)
    {
        if (!CustomerSessions.TryGetHash(Request, out var sessionHash)) return Unauthorized();
        var reservation = await db.Reservations
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new { r.QrToken, r.CustomerSessionId })
            .FirstOrDefaultAsync();
        if (reservation is null) return NotFound();
        if (!CustomerSessions.Matches(reservation.CustomerSessionId, sessionHash)) return Forbid();
        if (reservation.QrToken is null) return NotFound();

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(reservation.QrToken, QRCodeGenerator.ECCLevel.Q);
        var svg = new SvgQRCode(data).GetGraphic(8);
        return Content(svg, "image/svg+xml");
    }

    private void DeletePrivatePaymentFile(string? storedPath)
    {
        if (string.IsNullOrWhiteSpace(storedPath) || storedPath.StartsWith('/') || storedPath.StartsWith("data:", StringComparison.OrdinalIgnoreCase)) return;
        var path = Path.Combine(env.ContentRootPath, "App_Data", "payment-screenshots", Path.GetFileName(storedPath));
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }
}
