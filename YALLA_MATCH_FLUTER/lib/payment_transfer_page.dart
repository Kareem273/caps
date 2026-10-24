import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api_service.dart';
import 'app_theme.dart';
import 'booking_confirmed_page.dart';
import 'phone_validation.dart';

const Color transferBg = AppTheme.bg;
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
        message = 'Screenshot uploaded successfully. You can now confirm your booking.';
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

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied to clipboard!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reservation = approvedReservation ?? widget.reservation;
    final paymentPhone = reservation['courtPaymentPhone']?.toString() ?? '01012345678@instapay';
    final reservationId = reservation['id']?.toString() ?? '1042';
    final courtName = reservation['courtName']?.toString() ?? 'Court';
    final price = reservation['totalPrice'] ?? reservation['price'] ?? 250;

    return Scaffold(
      backgroundColor: transferBg,
      appBar: AppBar(
        backgroundColor: transferBg,
        elevation: 0,
        title: const Text('Payment & Transfer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: AmbientBackground(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Reservation Summary Card matching mockup
              LiquidGlassCard(
                borderRadius: 22,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Reservation #$reservationId',
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0x26F59E0B),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xB3F59E0B)),
                          ),
                          child: const Text(
                            'Pending Verification',
                            style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Icon(Icons.sports_soccer, color: Colors.white60, size: 18),
                        const SizedBox(width: 8),
                        const Text('Court: ', style: TextStyle(color: Colors.white60, fontSize: 15)),
                        Expanded(
                          child: Text(courtName, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.receipt_long_outlined, color: Colors.white60, size: 18),
                        const SizedBox(width: 8),
                        const Text('Total: ', style: TextStyle(color: Colors.white60, fontSize: 15)),
                        Text('$price EGP', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Customer Name Input Card
              LiquidGlassCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    const Icon(Icons.person_outline, color: Colors.white60, size: 24),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Customer Name', style: TextStyle(color: Colors.white54, fontSize: 12)),
                          TextField(
                            controller: _nameController,
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                            decoration: const InputDecoration(
                              hintText: 'Sarah Ahmed',
                              hintStyle: TextStyle(color: Colors.white30, fontSize: 16),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Mobile Number Input Card
              LiquidGlassCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    const Icon(Icons.phone_outlined, color: Colors.white60, size: 24),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Mobile Number', style: TextStyle(color: Colors.white54, fontSize: 12)),
                          TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            inputFormatters: egyptianMobileInputFormatters(),
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                            decoration: const InputDecoration(
                              hintText: '+20 123 456 7890',
                              hintStyle: TextStyle(color: Colors.white30, fontSize: 16),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(vertical: 4),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Glowing Action Button: Upload Transfer Screenshot
              Container(
                width: double.infinity,
                height: 54,
                decoration: AppTheme.greenGlowButtonDecoration(borderRadius: 16),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: isUploading ? null : uploadScreenshot,
                    child: Center(
                      child: isUploading
                          ? const CircularProgressIndicator(color: Colors.black, strokeWidth: 2.5)
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Upload Transfer Screenshot',
                                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 16),
                                ),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_upward_rounded, color: Colors.black, size: 20),
                              ],
                            ),
                    ),
                  ),
                ),
              ),

              if (showConfirmButton) ...[
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    color: const Color(0xFF132219),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.turfGreen, width: 1.5),
                    boxShadow: [
                      BoxShadow(color: AppTheme.turfGreen.withValues(alpha: 0.35), blurRadius: 16),
                    ],
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: isConfirming ? null : confirmBooking,
                      child: Center(
                        child: isConfirming
                            ? const CircularProgressIndicator(color: AppTheme.turfGreen, strokeWidth: 2.5)
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.check_circle_outline, color: AppTheme.turfGreen),
                                  SizedBox(width: 8),
                                  Text(
                                    'Confirm Reservation',
                                    style: TextStyle(color: AppTheme.turfGreen, fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),
                ),
              ],

              if (message != null) ...[
                const SizedBox(height: 12),
                Text(message!, style: const TextStyle(color: AppTheme.turfGreen, fontSize: 13, fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 20),

              // Transfer Instructions Card matching mockup
              LiquidGlassCard(
                borderRadius: 22,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Transfer Instructions',
                      style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Please transfer the exact amount to the InstaPay address below. Upload the confirmation screenshot for verification.',
                      style: TextStyle(color: Colors.white70, fontSize: 13.5, height: 1.45),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF111714),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text('InstaPay', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              paymentPhone,
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                            ),
                          ),
                          IconButton(
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            icon: const Icon(Icons.copy, color: Colors.white70, size: 18),
                            onPressed: () => _copyToClipboard(paymentPhone),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.account_balance, color: Colors.white70, size: 18),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
