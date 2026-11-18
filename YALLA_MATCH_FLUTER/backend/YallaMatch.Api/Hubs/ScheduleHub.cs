using Microsoft.AspNetCore.SignalR;

namespace YallaMatch.Api.Hubs;

public class ScheduleHub : Hub
{
    public async Task JoinCourtRoom(string courtId, string date)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"court:{courtId}:{date}");
    }

    public async Task LeaveCourtRoom(string courtId, string date)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"court:{courtId}:{date}");
    }

    public async Task BroadcastSlotStatus(string courtId, string date, int fromHour, int toHour, string status, string? reason = null)
    {
        await Clients.All.SendAsync("SlotStatusChanged", new
        {
            CourtId = courtId,
            Date = date,
            FromHour = fromHour,
            ToHour = toHour,
            Status = status,
            Reason = reason,
            TimestampUtc = DateTimeOffset.UtcNow
        });
    }
}
