using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using YallaMatch.Api.Contracts;
using YallaMatch.Api.Data;
using YallaMatch.Api.Entities;
using YallaMatch.Api.Security;

namespace YallaMatch.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin,Admin")]
public sealed class AdminController(YallaMatchDbContext db, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("refunds")]
    public async Task<ActionResult<List<RefundDto>>> GetRefunds()
    {
        var refunds = await db.RefundRecords
            .Include(r => r.Reservation)
                .ThenInclude(r => r.Court)
            .OrderByDescending(r => r.RefundedAtUtc)
            .ToListAsync();

        return Ok(refunds.Select(RefundDto.From));
    }

    [HttpGet("reservations/{id:guid}/payment-screenshot")]
    public async Task<IActionResult> GetPaymentScreenshot(Guid id)
    {
        var storedPath = await db.PaymentConfirmations
            .AsNoTracking()
            .Where(confirmation => confirmation.ReservationId == id)
            .Select(confirmation => confirmation.ScreenshotPath)
            .FirstOrDefaultAsync();
        if (string.IsNullOrWhiteSpace(storedPath)) return NotFound();

        // 1. Direct database storage (Base64 Data URI)
        if (storedPath.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var commaIndex = storedPath.IndexOf(',');
            if (commaIndex > 0)
            {
                var header = storedPath[..commaIndex];
                var base64 = storedPath[(commaIndex + 1)..];
                var mimeType = "image/jpeg";
                var semiIndex = header.IndexOf(';');
                if (semiIndex > 5)
                {
                    mimeType = header[5..semiIndex];
                }
                var bytes = Convert.FromBase64String(base64);
                return File(bytes, mimeType);
            }
        }

        // 2. Legacy fallback for existing files on disk
        var fileName = Path.GetFileName(storedPath);
        var protectedPath = Path.Combine(env.ContentRootPath, "App_Data", "payment-screenshots", fileName);
        if (System.IO.File.Exists(protectedPath))
        {
            return PhysicalFile(protectedPath, ImageContentType(fileName));
        }

        var legacyRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var legacyPath = Path.Combine(legacyRoot, "payment-screenshots", fileName);
        if (System.IO.File.Exists(legacyPath)) return PhysicalFile(legacyPath, ImageContentType(fileName));

        return NotFound();
    }

    [HttpPost("reservations/{id:guid}/approve-payment")]
    public async Task<IActionResult> ApprovePayment(Guid id)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reservation is null) return NotFound();

        // Check if the slot was already confirmed for another booking in the meantime
        var existingConfirmed = await db.Reservations
            .AnyAsync(r => r.Id != id 
                        && r.CourtId == reservation.CourtId 
                        && r.Date == reservation.Date 
                        && (r.Status == ReservationStatus.Confirmed || r.Status == ReservationStatus.CheckedIn)
                        && reservation.FromHour <= r.ToHour 
                        && reservation.ToHour >= r.FromHour);

        if (existingConfirmed)
        {
            return Conflict("هذا الموعد تم تأكيده بالفعل لحجز آخر.");
        }

        reservation.PaymentStatus = PaymentStatus.Approved;
        reservation.Status = ReservationStatus.Confirmed;
        if (reservation.PaymentConfirmation is not null)
        {
            reservation.PaymentConfirmation.Status = PaymentStatus.Approved;
            reservation.PaymentConfirmation.ReviewedAtUtc = DateTimeOffset.UtcNow;
        }

        reservation.QrToken ??= Codes.NewQrToken(reservation.Id);
        reservation.TrackingCode ??= Codes.NewTrackingCode();

        // Automatically cancel/reject all other pending reservations for the exact same court slot!
        var conflictingPending = await db.Reservations
            .Include(r => r.PaymentConfirmation)
            .Where(r => r.Id != id 
                     && r.CourtId == reservation.CourtId 
                     && r.Date == reservation.Date 
                     && (r.Status == ReservationStatus.PendingPaymentVerification 
                      || r.Status == ReservationStatus.AwaitingPaymentScreenshot)
                     && reservation.FromHour <= r.ToHour 
                     && reservation.ToHour >= r.FromHour)
            .ToListAsync();

        foreach (var conflict in conflictingPending)
        {
            conflict.Status = ReservationStatus.Rejected;
            conflict.PaymentStatus = PaymentStatus.Rejected;
            conflict.RejectionReason = "تم تأكيد الحجز لمستخدم آخر على نفس الموعد.";
            if (conflict.PaymentConfirmation is not null)
            {
                conflict.PaymentConfirmation.Status = PaymentStatus.Rejected;
                conflict.PaymentConfirmation.RejectionReason = conflict.RejectionReason;
                conflict.PaymentConfirmation.ReviewedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "قبول الدفع وتأكيد الحجز",
            Details = $"تم قبول إيصال الدفع للحجز #{reservation.TrackingCode} ({reservation.CustomerName}) على ملعب {reservation.Court?.Name}. تم إلغاء {conflictingPending.Count} حجوزات معارضة تلقائياً.",
            Category = "Payment",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(ReservationDto.From(reservation));
    }

    [HttpPost("reservations/{id:guid}/reject-payment")]
    public async Task<IActionResult> RejectPayment(Guid id, RejectPaymentRequest request)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reservation is null) return NotFound();

        reservation.PaymentStatus = PaymentStatus.Rejected;
        reservation.Status = ReservationStatus.Rejected;
        reservation.RejectionReason = request.Reason;
        if (reservation.PaymentConfirmation is not null)
        {
            reservation.PaymentConfirmation.Status = PaymentStatus.Rejected;
            reservation.PaymentConfirmation.ReviewedAtUtc = DateTimeOffset.UtcNow;
            reservation.PaymentConfirmation.RejectionReason = request.Reason;
        }

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø±ÙØ¶ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ø¯ÙØ¹",
            Details = $"ØªÙ… Ø±ÙØ¶ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ø¯ÙØ¹ Ù„Ù„Ø­Ø¬Ø² #{reservation.TrackingCode} ({reservation.CustomerName}) Ø¹Ù„Ù‰ Ù…Ù„Ø¹Ø¨ {reservation.Court?.Name}. Ø§Ù„Ø³Ø¨Ø¨: {request.Reason}",
            Category = "Payment",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("reservations/{id:guid}/cancel")]
    public async Task<IActionResult> CancelReservation(Guid id, CancelReservationRequest request)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reservation is null) return NotFound();
        if (reservation.Status == ReservationStatus.CheckedIn) return Conflict("A checked-in reservation cannot be cancelled.");
        if (reservation.Status == ReservationStatus.Cancelled) return Conflict("Reservation is already cancelled.");

        reservation.Status = ReservationStatus.Cancelled;
        reservation.RejectionReason = string.IsNullOrWhiteSpace(request.Reason) ? "Cancelled by admin because payment was not received." : request.Reason.Trim();
        if (reservation.PaymentStatus != PaymentStatus.Approved)
        {
            reservation.PaymentStatus = PaymentStatus.Rejected;
            if (reservation.PaymentConfirmation is not null)
            {
                reservation.PaymentConfirmation.Status = PaymentStatus.Rejected;
                reservation.PaymentConfirmation.RejectionReason = reservation.RejectionReason;
                reservation.PaymentConfirmation.ReviewedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø¥Ù„ØºØ§Ø¡ Ø­Ø¬Ø²",
            Details = $"Ù‚Ø§Ù… Ø§Ù„Ù…Ø´Ø±Ù Ø¨Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø­Ø¬Ø² #{reservation.TrackingCode} ({reservation.CustomerName}) Ø¹Ù„Ù‰ Ù…Ù„Ø¹Ø¨ {reservation.Court?.Name}. Ø§Ù„Ø³Ø¨Ø¨: {reservation.RejectionReason}",
            Category = "Reservation",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(ReservationDto.From(reservation));
    }

    [HttpGet("refund-requests")]
    public async Task<ActionResult<List<ReservationDto>>> GetRefundRequests()
    {
        var requests = await db.Reservations
            .Include(r => r.Court)
            .Where(r => r.PaymentStatus == PaymentStatus.RefundRequested)
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync();

        return Ok(requests.Select(ReservationDto.From));
    }

    [HttpPost("reservations/{id:guid}/refund")]
    public async Task<ActionResult<RefundDto>> MarkRefunded(Guid id, ProcessRefundRequest request)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .Include(r => r.Refund)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reservation is null) return NotFound();
        if (reservation.Refund is not null) return Conflict("This reservation has already been refunded.");
        if (reservation.PaymentStatus != PaymentStatus.Approved && reservation.PaymentStatus != PaymentStatus.RefundRequested)
            return Conflict("Only confirmed, paid, or refund-requested reservations can be refunded.");

        var refund = new RefundRecord
        {
            ReservationId = reservation.Id,
            Amount = reservation.Price,
            Reason = string.IsNullOrWhiteSpace(request?.Reason) ? reservation.RejectionReason ?? "Refunded by admin." : request.Reason.Trim(),
        };

        reservation.Status = ReservationStatus.Cancelled;
        reservation.PaymentStatus = PaymentStatus.Refunded;
        reservation.RejectionReason = refund.Reason;
        if (reservation.PaymentConfirmation is not null)
        {
            reservation.PaymentConfirmation.Status = PaymentStatus.Refunded;
            reservation.PaymentConfirmation.ReviewedAtUtc = refund.RefundedAtUtc;
            reservation.PaymentConfirmation.RejectionReason = reservation.RejectionReason;
        }

        db.RefundRecords.Add(refund);

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ù…Ø§Ù„ÙŠ (Refund)",
            Details = $"ØªÙ…Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ù…Ø¨Ù„Øº {refund.Amount} Ø¬.Ù… Ù„Ù„Ø­Ø¬Ø² #{reservation.TrackingCode} ({reservation.CustomerName}). Ø§Ù„Ø³Ø¨Ø¨: {refund.Reason}",
            Category = "Payment",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(RefundDto.From(refund));
    }

    [HttpPost("reservations/{id:guid}/refund/approve")]
    public async Task<ActionResult<RefundDto>> ApproveRefund(Guid id, ProcessRefundRequest request)
    {
        return await MarkRefunded(id, request);
    }

    [HttpPost("reservations/{id:guid}/refund/reject")]
    public async Task<IActionResult> RejectRefund(Guid id, ProcessRefundRequest request)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .Include(r => r.PaymentConfirmation)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (reservation is null) return NotFound();
        if (reservation.PaymentStatus != PaymentStatus.RefundRequested)
            return Conflict("Reservation is not pending refund review.");

        reservation.PaymentStatus = PaymentStatus.Approved;
        reservation.RejectionReason = string.IsNullOrWhiteSpace(request?.Reason) ? "Refund request rejected by admin." : request.Reason.Trim();
        if (reservation.PaymentConfirmation is not null)
        {
            reservation.PaymentConfirmation.Status = PaymentStatus.Approved;
            reservation.PaymentConfirmation.RejectionReason = reservation.RejectionReason;
        }

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø±ÙØ¶ Ø·Ù„Ø¨ Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ù…Ø§Ù„ÙŠ",
            Details = $"ØªÙ… Ø±ÙØ¶ Ø·Ù„Ø¨ Ø§Ø³ØªØ±Ø¯Ø§Ø¯ Ø§Ù„Ø­Ø¬Ø² #{reservation.TrackingCode} ({reservation.CustomerName}). Ø§Ù„Ø³Ø¨Ø¨: {reservation.RejectionReason}",
            Category = "Payment",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(ReservationDto.From(reservation));
    }

    [HttpPost("qr/validate")]
    public async Task<IActionResult> ValidateQr(QrRequest request)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .FirstOrDefaultAsync(r => r.QrToken == request.QrToken);

        return reservation is null ? NotFound() : Ok(ReservationDto.From(reservation));
    }

    [HttpPost("qr/check-in")]
    public async Task<IActionResult> CheckIn(QrRequest request)
    {
        var reservation = await db.Reservations
            .Include(r => r.Court)
            .FirstOrDefaultAsync(r => r.QrToken == request.QrToken);

        if (reservation is null) return NotFound();
        if (reservation.Status != ReservationStatus.Confirmed) return Conflict("Reservation is not confirmed.");

        reservation.Status = ReservationStatus.CheckedIn;
        reservation.CheckedInAtUtc = DateTimeOffset.UtcNow;

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø§Ù„Ù„Ø§Ø¹Ø¨ (Check-In)",
            Details = $"ØªÙ… ØªØ£ÙƒÙŠØ¯ ÙˆØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø§Ù„Ù„Ø§Ø¹Ø¨ {reservation.CustomerName} Ù„Ù„Ø­Ø¬Ø² #{reservation.TrackingCode} Ø¹Ù„Ù‰ Ù…Ù„Ø¹Ø¨ {reservation.Court?.Name}.",
            Category = "Check-In",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Ok(ReservationDto.From(reservation));
    }

    [HttpGet("audit-logs")]
    public async Task<ActionResult<List<AuditLogDto>>> GetAuditLogs()
    {
        var logs = await db.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(200)
            .ToListAsync();

        return Ok(logs.Select(AuditLogDto.From));
    }

    private (string Email, string Role) GetActorInfo()
    {
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value
            ?? "admin@yallamatch.local";
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? "Admin";
        return (email, role);
    }

    private static bool HasNotStarted(Reservation reservation)
    {
        if (!DateOnly.TryParseExact(reservation.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return false;

        var start = date.ToDateTime(new TimeOnly(Math.Clamp(reservation.FromHour, 0, 23), 0));
        return start > CairoNow().DateTime;
    }

    private static DateTimeOffset CairoNow()
    {
        try
        {
            return TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Egypt Standard Time"));
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo"));
        }
    }

    private static string ImageContentType(string fileName) =>
        Path.GetExtension(fileName).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };
}
