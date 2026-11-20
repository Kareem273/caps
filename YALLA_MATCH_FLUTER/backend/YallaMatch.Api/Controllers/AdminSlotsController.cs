using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using YallaMatch.Api.Contracts;
using YallaMatch.Api.Data;
using YallaMatch.Api.Entities;
using YallaMatch.Api.Security;

namespace YallaMatch.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin,Admin")]
public sealed class AdminSlotsController(YallaMatchDbContext db) : ControllerBase
{
    [HttpPost("courts/{courtId:guid}/slots/block")]
    public async Task<IActionResult> BlockSlot(Guid courtId, ManageCourtSlotRequest request)
    {
        if (!IsValidSlot(request.Date, request.FromHour, request.ToHour)) return BadRequest("Use a valid date and hours from 0 to 23.");
        if (!await CanManageCourtAsync(courtId)) return Forbid();

        if (await HasReservationOverlap(courtId, request.Date, request.FromHour, request.ToHour))
            return Conflict("A reservation already exists in this slot.");
        if (await HasBlockOverlap(courtId, request.Date, request.FromHour, request.ToHour))
            return Conflict("This slot is already blocked.");

        var block = new CourtSlotBlock
        {
            CourtId = courtId,
            Date = request.Date,
            FromHour = request.FromHour,
            ToHour = request.ToHour,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim()
        };
        db.CourtSlotBlocks.Add(block);

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø¥ØºÙ„Ø§Ù‚ ÙØªØ±Ø© Ù…Ù„Ø¹Ø¨ (Slot Block)",
            Details = $"ØªÙ… Ø¥ØºÙ„Ø§Ù‚ ÙØªØ±Ø© Ø§Ù„Ù…Ù„Ø¹Ø¨ Ù„ØªØ§Ø±ÙŠØ® {request.Date} Ù…Ù† Ø§Ù„Ø³Ø§Ø¹Ø© {request.FromHour}:00 Ø¥Ù„Ù‰ {request.ToHour}:00. Ø§Ù„Ø³Ø¨Ø¨: {block.Reason ?? "ØµÙŠØ§Ù†Ø© / Ø­Ø¬Ø² Ø®Ø§Øµ"}",
            Category = "Schedule",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return Created($"/api/admin/courts/{courtId}/slots/block/{block.Id}", block);
    }

    [HttpDelete("courts/{courtId:guid}/slots/block")]
    public async Task<IActionResult> UnblockSlot(Guid courtId, [FromQuery] string date, [FromQuery] int hour)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _) || hour is < 0 or > 23)
            return BadRequest("Use a valid date and hour from 0 to 23.");

        var blocks = await db.CourtSlotBlocks
            .Where(s => s.CourtId == courtId && s.Date == date && s.FromHour <= hour && s.ToHour >= hour)
            .ToListAsync();
        if (blocks.Count == 0) return NotFound("Slot block not found.");
        if (!await CanManageCourtAsync(courtId)) return Forbid();

        db.CourtSlotBlocks.RemoveRange(blocks);

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø¥Ù„ØºØ§Ø¡ Ø¥ØºÙ„Ø§Ù‚ ÙØªØ±Ø© Ù…Ù„Ø¹Ø¨ (Slot Unblock)",
            Details = $"ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø¥ØºÙ„Ø§Ù‚ ÙˆØ¥Ø¹Ø§Ø¯Ø© Ø¥ØªØ§Ø­Ø© ÙØªØ±Ø© Ø§Ù„Ù…Ù„Ø¹Ø¨ Ù„ØªØ§Ø±ÙŠØ® {date} Ø§Ù„Ø³Ø§Ø¹Ø© {hour}:00.",
            Category = "Schedule",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("reservations/offline")]
    public async Task<IActionResult> CreateOfflineReservation(CreateOfflineReservationRequest request)
    {
        if (!IsValidSlot(request.Date, request.FromHour, request.ToHour)) return BadRequest("Use a valid date and hours from 0 to 23.");
        if (IsExpiredSlot(request.Date, request.FromHour)) return Conflict("Selected time has already started.");

        var court = await db.Courts.FirstOrDefaultAsync(c => c.Id == request.CourtId && c.IsActive);
        if (court is null) return NotFound("Court not found.");
        if (!await CanManageCourtAsync(court.Id)) return Forbid();
        if (string.IsNullOrWhiteSpace(request.CustomerPhone))
            return BadRequest("Customer phone is required for offline bookings.");
        if (await HasReservationOverlap(request.CourtId, request.Date, request.FromHour, request.ToHour))
            return Conflict("A reservation already exists in this slot.");
        if (await HasBlockOverlap(request.CourtId, request.Date, request.FromHour, request.ToHour))
            return Conflict("This slot is blocked. Unblock it before booking.");

        var duration = request.ToHour - request.FromHour + 1;
        var reservation = new Reservation
        {
            CourtId = court.Id,
            CustomerSessionId = $"offline-{Guid.NewGuid():N}",
            CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? "Walk-in customer" : request.CustomerName.Trim(),
            CustomerPhone = request.CustomerPhone.Trim(),
            Date = request.Date,
            FromHour = request.FromHour,
            ToHour = request.ToHour,
            Price = court.Price * duration,
            Source = BookingSource.Offline,
            Status = ReservationStatus.Confirmed,
            PaymentStatus = PaymentStatus.Approved,
            TrackingCode = Codes.NewTrackingCode()
        };
        reservation.QrToken = Codes.NewQrToken(reservation.Id);
        db.Reservations.Add(reservation);

        var (actorEmail, actorRole) = GetActorInfo();
        db.AuditLogs.Add(new AuditLog
        {
            AdminEmail = actorEmail,
            AdminRole = actorRole,
            Action = "Ø­Ø¬Ø² Ù…Ø¨Ø§Ø´Ø± ÙÙŠ Ø§Ù„Ù…Ù„Ø¹Ø¨ (Walk-in)",
            Details = $"Ù‚Ø§Ù… Ø§Ù„Ù…Ø´Ø±Ù Ø¨ØªØ³Ø¬ÙŠÙ„ Ø­Ø¬Ø² ÙŠØ¯ÙˆÙŠ Ù…Ø¨Ø§Ø´Ø± Ù„Ù„Ø§Ø¹Ø¨ {reservation.CustomerName} ({reservation.CustomerPhone}) Ø¹Ù„Ù‰ Ù…Ù„Ø¹Ø¨ {court.Name} Ù„ØªØ§Ø±ÙŠØ® {reservation.Date} ({reservation.FromHour}:00-{reservation.ToHour}:00).",
            Category = "Reservation",
            Timestamp = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();

        reservation.Court = court;
        return Created($"/api/reservations/{reservation.Id}", ReservationDto.From(reservation));
    }

    private Task<bool> HasReservationOverlap(Guid courtId, string date, int fromHour, int toHour) =>
        db.Reservations.AnyAsync(r => r.CourtId == courtId && r.Date == date &&
            r.Status != ReservationStatus.Rejected && r.Status != ReservationStatus.Cancelled &&
            r.Status != ReservationStatus.AwaitingPaymentScreenshot &&
            fromHour <= r.ToHour && toHour >= r.FromHour);

    private Task<bool> HasBlockOverlap(Guid courtId, string date, int fromHour, int toHour) =>
        db.CourtSlotBlocks.AnyAsync(s => s.CourtId == courtId && s.Date == date &&
            fromHour <= s.ToHour && toHour >= s.FromHour);

    private async Task<bool> CanManageCourtAsync(Guid courtId)
    {
        return await db.Courts.AnyAsync(c => c.Id == courtId && c.IsActive);
    }

    private static bool IsValidSlot(string date, int fromHour, int toHour) =>
        DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out _) &&
        fromHour is >= 0 and <= 23 && toHour >= fromHour && toHour <= 23;

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

    private static bool IsExpiredSlot(string date, int hour)
    {
        var now = DateTimeOffset.Now;
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var slotDate))
            return false;

        var today = DateOnly.FromDateTime(now.DateTime);
        return slotDate < today || (slotDate == today && hour <= now.Hour);
    }
}
