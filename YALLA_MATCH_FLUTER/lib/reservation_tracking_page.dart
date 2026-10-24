import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import 'api_service.dart';
import 'app_language.dart';
import 'app_theme.dart';

const Color trackingBg = AppTheme.bg;
const Color trackingCard = AppTheme.darkCard;
const Color trackingGreen = AppTheme.turfGreen;

class ReservationTrackingPage extends StatefulWidget {
  const ReservationTrackingPage({super.key});

  @override
  State<ReservationTrackingPage> createState() => _ReservationTrackingPageState();
}

class _ReservationTrackingPageState extends State<ReservationTrackingPage> {
  final controller = TextEditingController();
  bool isLoading = false;
  bool isRefundLoading = false;
  Map<String, dynamic>? reservation;
  String? message;
  String? refundMessage;
  String refundReason = 'Refunded before the booking start time.';

  Future<void> track() async {
    final isAr = AppLanguageManager.isArabic;
    setState(() {
      isLoading = true;
      message = null;
      refundMessage = null;
      reservation = null;
    });
    try {
      final result = await ApiService.trackReservation(controller.text.trim());
      setState(() => reservation = result);
    } catch (e) {
      setState(() => message = isAr ? 'لم يتم العثور على الحجز' : 'Reservation not found');
    } finally {
      setState(() => isLoading = false);
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  bool _isWithinRefundWindow(Map<String, dynamic> reservation) {
    final dateString = reservation['date']?.toString();
    final fromHour = int.tryParse(reservation['fromHour']?.toString() ?? '');
    if (dateString == null || fromHour == null) return false;
    final start = DateTime.tryParse('${dateString}T${fromHour.toString().padLeft(2, '0')}:00:00');
    if (start == null) return false;
    return start.difference(DateTime.now()) < const Duration(hours: 48);
  }

  bool _canRequestRefund(Map<String, dynamic> reservation) {
    final status = reservation['status']?.toString();
    final paymentStatus = reservation['paymentStatus']?.toString();
    return status == 'Confirmed' && paymentStatus == 'Approved' && !_isWithinRefundWindow(reservation);
  }

  Future<void> _showRefundDialog(Map<String, dynamic> reservation) async {
    final isAr = AppLanguageManager.isArabic;
    if (_isWithinRefundWindow(reservation)) {
      setState(() {
        refundMessage = isAr
            ? 'وقت الريفاند اتمنع. لا يمكن طلب ريفاند قبل أقل من 48 ساعة من الحجز.'
            : 'Refund window passed. Refunds cannot be requested less than 48 hours before booking.';
      });
      return;
    }

    refundReason = 'Refunded before the booking start time.';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: trackingCard,
          title: Text(isAr ? 'طلب ريفاند' : 'Request Refund', style: const TextStyle(color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isAr ? 'اكتب سبب طلب الريفاند:' : 'Enter reason for refund request:',
                style: const TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 12),
              TextField(
                maxLines: 3,
                minLines: 1,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: isAr ? 'سبب طلب الريفاند' : 'Refund reason',
                  hintStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: const Color(0xFF161616),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                onChanged: (value) => refundReason = value,
                controller: TextEditingController(text: refundReason),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(color: Colors.white70)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(backgroundColor: trackingGreen, foregroundColor: Colors.black),
              child: Text(isAr ? 'إرسال طلب' : 'Submit Request'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await _requestRefund(reservation);
    }
  }

  Future<void> _requestRefund(Map<String, dynamic> reservation) async {
    final isAr = AppLanguageManager.isArabic;
    final trackingCode = reservation['trackingCode']?.toString();
    if (trackingCode == null || trackingCode.isEmpty) {
      setState(() => refundMessage = isAr ? 'فشل طلب الريفاند: لا يوجد رمز تتبع صالح.' : 'Refund request failed: Invalid tracking code.');
      return;
    }

    setState(() {
      isRefundLoading = true;
      refundMessage = null;
    });

    try {
      await ApiService.requestRefundByTrackingCode(
        trackingCode: trackingCode,
        reason: refundReason.trim().isEmpty ? null : refundReason.trim(),
      );
      setState(() {
        refundMessage = isAr
            ? 'تم إرسال طلب الريفاند بنجاح وهو قيد المراجعة حالياً من الإدارة.'
            : 'Refund request submitted successfully and is currently under review by management.';
      });
      await track();
    } catch (e) {
      setState(() {
        refundMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() {
        isRefundLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = AppLanguageManager.isArabic;
    return Scaffold(
      backgroundColor: trackingBg,
      appBar: AppBar(
        backgroundColor: trackingBg,
        elevation: 0,
        title: Text(isAr ? 'تتبع الحجز' : 'Track Reservation', style: const TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: AmbientBackground(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: SingleChildScrollView(
            child: Column(
              children: [
                Container(
                  decoration: AppTheme.liquidGlassDecoration(borderRadius: 14),
                  child: TextField(
                    controller: controller,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: isAr ? 'رمز تتبع الحجز' : 'Reservation tracking code',
                      hintStyle: const TextStyle(color: Colors.white54),
                      prefixIcon: const Icon(Icons.qr_code, color: trackingGreen),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  height: 50,
                  decoration: AppTheme.greenGlowButtonDecoration(borderRadius: 14),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onPressed: isLoading ? null : track,
                      child: Center(
                        child: isLoading
                            ? const CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5)
                            : Text(
                                isAr ? 'تتبع' : 'Track',
                                style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                      ),
                    ),
                  ),
                ),
                if (message != null)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(message!, style: const TextStyle(color: Colors.redAccent)),
                  ),
                if (refundMessage != null)
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(refundMessage!, style: const TextStyle(color: Colors.greenAccent)),
                  ),
                if (reservation != null) ...[
                  _resultCard(),
                  const SizedBox(height: 14),
                  _buildRefundSection(reservation!),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRefundSection(Map<String, dynamic> reservation) {
    final isAr = AppLanguageManager.isArabic;
    if (reservation['paymentStatus']?.toString() == 'RefundRequested') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF261D00),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.amber.shade700),
        ),
        child: Text(
          isAr
              ? '⏳ تم تقديم طلب الريفاند بنجاح، وهو قيد المراجعة حالياً من قبل الإدارة.'
              : '⏳ Refund request submitted successfully and is currently under review by management.',
          style: const TextStyle(color: Colors.amberAccent, fontWeight: FontWeight.bold, fontSize: 14),
          textAlign: TextAlign.center,
        ),
      );
    }

    if (_canRequestRefund(reservation)) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: isRefundLoading ? null : () => _showRefundDialog(reservation),
          style: ElevatedButton.styleFrom(backgroundColor: trackingGreen, foregroundColor: Colors.black),
          child: isRefundLoading
              ? const CircularProgressIndicator(color: Colors.black)
              : Text(isAr ? 'طلب ريفاند' : 'Request Refund'),
        ),
      );
    }

    if (reservation['status']?.toString() == 'Confirmed' && reservation['paymentStatus']?.toString() == 'Approved') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(12)),
        child: Text(
          isAr
              ? 'وقت الريفاند اتمنع. لا يمكن طلب ريفاند قبل أقل من 48 ساعة من الحجز.'
              : 'Refund window passed. Refunds cannot be requested less than 48 hours before booking.',
          style: const TextStyle(color: trackingGreen),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(12)),
      child: Text(
        isAr ? 'لا يمكن طلب ريفاند لهذا الحجز الآن.' : 'Refund cannot be requested for this reservation at this time.',
        style: const TextStyle(color: Colors.white70),
        textAlign: TextAlign.center,
      ),
    );
  }

  Future<void> _copyToClipboard(String value, String label) async {
    final isAr = AppLanguageManager.isArabic;
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(isAr ? 'تم نسخ $label إلى الحافظة' : '$label copied to clipboard')));
  }

  Future<void> _shareValue(String value, String label) async {
    await SharePlus.instance.share(ShareParams(text: '$label:\n$value'));
  }

  Widget _resultCard() {
    final isAr = AppLanguageManager.isArabic;
    final r = reservation!;
    final qrToken = r['qrToken']?.toString();
    final customerName = r['customerName']?.toString() ?? (isAr ? 'غير مدخل' : 'Not provided');
    final customerPhone = r['customerPhone']?.toString() ?? (isAr ? 'غير مدخل' : 'Not provided');
    final status = r['status']?.toString() ?? (isAr ? 'غير معروف' : 'Unknown');
    final paymentStatus = r['paymentStatus']?.toString() ?? (isAr ? 'غير معروف' : 'Unknown');

    return LiquidGlassCard(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(18),
      borderRadius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('${isAr ? "الملعب" : "Court"}: ${r['courtName']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 6),
          Text('${isAr ? "التاريخ" : "Date"}: ${r['date']}', style: const TextStyle(color: Colors.white70)),
          Text('${isAr ? "الوقت" : "Time"}: ${r['fromHour']} - ${r['toHour']}', style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 8),
          Text('${isAr ? "الحالة" : "Status"}: $status', style: const TextStyle(color: trackingGreen, fontWeight: FontWeight.bold)),
          Text('${isAr ? "الدفع" : "Payment"}: $paymentStatus', style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 10),
          Text('${isAr ? "اسم العميل" : "Customer name"}: $customerName', style: const TextStyle(color: Colors.white)),
          Text('${isAr ? "رقم الهاتف" : "Customer phone"}: $customerPhone', style: const TextStyle(color: Colors.white70)),
          if (qrToken != null && qrToken.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF161616).withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                children: [
                  Text(
                    isAr ? 'رمز الـ QR للحجز' : 'Booking QR Code',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: QrImageView(data: qrToken, size: 200),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _copyToClipboard(qrToken, isAr ? 'رمز QR' : 'QR code'),
                          icon: const Icon(Icons.copy, size: 18),
                          label: Text(isAr ? 'نسخ QR' : 'Copy QR'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: trackingGreen,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _shareValue(qrToken, isAr ? 'رمز QR' : 'QR code'),
                          icon: const Icon(Icons.share, size: 18),
                          label: Text(isAr ? 'مشاركة QR' : 'Share QR'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2A2A2A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
