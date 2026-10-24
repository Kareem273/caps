import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import 'api_service.dart';
import 'app_theme.dart';
import 'booking_confirmed_page.dart';
import 'phone_validation.dart';

const Color transferBg = AppTheme.bg;
const Color transferCard = AppTheme.darkCard;
const Color transferGreen = AppTheme.turfGreen;

class PaymentTransferPage extends StatefulWidget {
  final Map<String, dynamic> reservation;
  final String customerSessionId;

  const PaymentTransferPage({super.key, required this.reservation, required this.customerSessionId});

  @override
  State<PaymentTransferPage> createState() => _PaymentTransferPageState();
}

class _PaymentTransferPageState extends State<PaymentTransferPage> {
  bool isUploading = false;
  bool isConfirming = false;
  bool showConfirmButton = false;
  String? message;
  Map<String, dynamic>? approvedReservation;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final reservation = widget.reservation;
    final screenshot = reservation['paymentScreenshotUrl'] ?? reservation['paymentConfirmation']?['screenshotPath'];
    if (screenshot != null) {
      showConfirmButton = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> uploadScreenshot() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.image,
      withData: true,
    );
    if (picked == null || picked.files.isEmpty) return;

    setState(() {
      isUploading = true;
      showConfirmButton = false;
      message = null;
    });

    try {
      final file = picked.files.first;
      final result = await ApiService.uploadPaymentScreenshot(
        reservationId: widget.reservation['id'].toString(),
        customerSessionId: widget.customerSessionId,
        fileName: file.name.isNotEmpty ? file.name : 'payment-confirmation.png',
        bytes: file.bytes,
        path: file.path,
      );
      setState(() {
        approvedReservation = result;
        showConfirmButton = true;
        message = 'Screenshot uploaded. Reservation is pending payment verification.';
      });
    } catch (e) {
      setState(() {
        showConfirmButton = false;
        message = 'Upload failed: $e';
      });
    } finally {
      setState(() => isUploading = false);
    }
  }

  Future<void> confirmBooking() async {
    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty) {
      setState(() => message = 'Please enter your name before confirming.');
      return;
    }

    final phoneError = validateEgyptianMobile(phone, required: true);
    if (phoneError != null) {
      setState(() => message = phoneError);
      return;
    }

    setState(() => isConfirming = true);
    try {
      final reservation = approvedReservation ?? widget.reservation;
      await ApiService.updateReservationCustomer(
        reservationId: reservation['id'].toString(),
        customerSessionId: widget.customerSessionId,
        customerName: name,
        customerPhone: phone,
      );
      final mergedReservation = Map<String, dynamic>.from(reservation)
        ..['customerName'] = name
        ..['customerPhone'] = phone;
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => BookingConfirmedPage(reservation: mergedReservation)),
        (route) => false,
      );
    } catch (e) {
      if (mounted) {
        setState(() => message = 'Could not save customer details: $e');
      }
    } finally {
      if (mounted) setState(() => isConfirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final reservation = approvedReservation ?? widget.reservation;
    final paymentPhone = reservation['courtPaymentPhone']?.toString();

    return Scaffold(
      backgroundColor: transferBg,
      appBar: AppBar(
        backgroundColor: transferBg,
        elevation: 0,
        title: const Text('Payment Confirmation', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: AmbientBackground(
        child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _section(
              title: 'Transfer Instructions',
              children: [
                _InfoRow(label: 'Transfer to court', value: paymentPhone?.isNotEmpty == true ? paymentPhone! : 'Ask the court administrator'),
                _InfoRow(label: 'Reference', value: 'Use your reservation ID'),
              ],
            ),
            const SizedBox(height: 16),
            _section(
              title: 'Reservation',
              children: [
                _InfoRow(label: 'Reservation ID', value: reservation['id'].toString()),
                _InfoRow(label: 'Status', value: reservation['status']?.toString() ?? 'Pending Payment Verification'),
                _InfoRow(label: 'Payment', value: reservation['paymentStatus']?.toString() ?? 'PendingVerification'),
              ],
            ),
            const SizedBox(height: 18),
            _section(
              title: 'Customer Details',
              children: [
                TextField(
                  controller: _nameController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Customer Name',
                    labelStyle: const TextStyle(color: Colors.white60),
                    filled: true,
                    fillColor: const Color(0xFF161616).withValues(alpha: 0.6),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.turfGreen, width: 1.2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  inputFormatters: egyptianMobileInputFormatters(),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Mobile Number',
                    labelStyle: const TextStyle(color: Colors.white60),
                    filled: true,
                    fillColor: const Color(0xFF161616).withValues(alpha: 0.6),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.turfGreen, width: 1.2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: isUploading ? null : uploadScreenshot,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.turfGreen,
                  foregroundColor: Colors.black,
                  elevation: 4,
                  shadowColor: AppTheme.turfGreen.withValues(alpha: 0.4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: isUploading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                      )
                    : const Icon(Icons.upload_file),
                label: const Text('Upload Transfer Screenshot', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 12),
              Text(message!, style: const TextStyle(color: AppTheme.turfGreen)),
            ],
            if (showConfirmButton) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: (!showConfirmButton || isConfirming) ? null : confirmBooking,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.turfGreen,
                    side: const BorderSide(color: AppTheme.turfGreen, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: isConfirming
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: AppTheme.turfGreen, strokeWidth: 2))
                      : const Icon(Icons.check_circle_outline),
                  label: const Text('Confirm booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
  }

  Widget _section({required String title, required List<Widget> children}) {
    return LiquidGlassCard(
      borderRadius: 18,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(color: Colors.white54))),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
