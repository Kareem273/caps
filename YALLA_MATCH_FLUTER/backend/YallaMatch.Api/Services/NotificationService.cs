using System.Collections.Concurrent;

namespace YallaMatch.Api.Services;

public record NotificationLog(
    Guid Id,
    string RecipientPhone,
    string NotificationType,
    string Title,
    string Message,
    DateTimeOffset SentAtUtc,
    string DeliveryChannel,
    bool IsDelivered
);

public interface INotificationService
{
    Task<NotificationLog> SendBookingConfirmationAsync(string customerPhone, string courtName, string date, int fromHour, int toHour, string qrToken);
    Task<NotificationLog> SendPaymentReminderAsync(string customerPhone, string trackingCode, int minutesRemaining);
    Task<NotificationLog> SendSlotCancelledAsync(string customerPhone, string courtName, string date, string reason);
    IReadOnlyList<NotificationLog> GetRecentNotificationLogs();
}

public class NotificationService : INotificationService
{
    private static readonly ConcurrentQueue<NotificationLog> _notificationHistory = new();
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    public Task<NotificationLog> SendBookingConfirmationAsync(string customerPhone, string courtName, string date, int fromHour, int toHour, string qrToken)
    {
        var log = new NotificationLog(
            Id: Guid.NewGuid(),
            RecipientPhone: customerPhone,
            NotificationType: "BOOKING_CONFIRMED",
            Title: "تم تأكيد حجزك في يلا ماتش! ⚽",
            Message: $"تم تأكيد حجزك لـ {courtName} يوم {date} من الساعة {fromHour}:00 إلى {toHour + 1}:00. تذكرة الدخول الذكية جاهزة في التطبيق.",
            SentAtUtc: DateTimeOffset.UtcNow,
            DeliveryChannel: "FCM_PUSH_AND_SMS",
            IsDelivered: true
        );

        _notificationHistory.Enqueue(log);
        while (_notificationHistory.Count > 100)
            _notificationHistory.TryDequeue(out _);

        _logger.LogInformation("[FCM Push & SMS] Sent booking confirmation to {Phone} for {CourtName}", customerPhone, courtName);
        return Task.FromResult(log);
    }

    public Task<NotificationLog> SendPaymentReminderAsync(string customerPhone, string trackingCode, int minutesRemaining)
    {
        var log = new NotificationLog(
            Id: Guid.NewGuid(),
            RecipientPhone: customerPhone,
            NotificationType: "PAYMENT_REMINDER",
            Title: "تنبيه سداد الحجز ⏳",
            Message: $"متبقي {minutesRemaining} دقيقة لرفع إيصال السداد لحجزك كود {trackingCode} قبل تحرير الموعد تلقائياً.",
            SentAtUtc: DateTimeOffset.UtcNow,
            DeliveryChannel: "FCM_PUSH",
            IsDelivered: true
        );

        _notificationHistory.Enqueue(log);
        _logger.LogInformation("[FCM Push] Sent payment reminder to {Phone} (Tracking: {Code})", customerPhone, trackingCode);
        return Task.FromResult(log);
    }

    public Task<NotificationLog> SendSlotCancelledAsync(string customerPhone, string courtName, string date, string reason)
    {
        var log = new NotificationLog(
            Id: Guid.NewGuid(),
            RecipientPhone: customerPhone,
            NotificationType: "BOOKING_CANCELLED",
            Title: "إلغاء حجز الملعب",
            Message: $"تم إلغاء حجز {courtName} بتاريخ {date}. السبب: {reason}. يرجى مراجعة إدارة المنشأة.",
            SentAtUtc: DateTimeOffset.UtcNow,
            DeliveryChannel: "FCM_PUSH_AND_SMS",
            IsDelivered: true
        );

        _notificationHistory.Enqueue(log);
        _logger.LogWarning("[FCM Push] Sent cancellation alert to {Phone}: {Reason}", customerPhone, reason);
        return Task.FromResult(log);
    }

    public IReadOnlyList<NotificationLog> GetRecentNotificationLogs() => _notificationHistory.ToArray();
}
