import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import 'app_theme.dart';
import 'landing_page.dart';

class BookingConfirmedPage extends StatelessWidget {
  final Map<String, dynamic> reservation;

  const BookingConfirmedPage({super.key, required this.reservation});

  Future<void> _copyToClipboard(BuildContext context, String value, String label) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label copied to clipboard')),
    );
  }

  Future<void> _shareValue(String value, String label) async {
    await SharePlus.instance.share(ShareParams(text: '$label:\n$value'));
  }

  Future<void> _shareQrHtml(String qrToken) async {
    final encodedToken = Uri.encodeComponent(qrToken);
    final htmlLink = '<!DOCTYPE html><html><body><p><a href="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=$encodedToken" target="_blank">Scan QR Code</a></p></body></html>';
    await SharePlus.instance.share(ShareParams(text: htmlLink));
  }

  @override
  Widget build(BuildContext context) {
    final qrToken = reservation['qrToken']?.toString();
    final trackingCode = reservation['trackingCode']?.toString();
    final reservationId = reservation['id']?.toString();
    final customerName = reservation['customerName']?.toString() ?? reservation['CustomerName']?.toString();
    final customerPhone = reservation['customerPhone']?.toString() ?? reservation['CustomerPhone']?.toString();

    return Scaffold(
      backgroundColor: const Color(0xFF050505),
      body: AmbientBackground(
        child: SafeArea(
          child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: AppTheme.turfGreen.withValues(alpha: 0.16),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle_outline, size: 48, color: AppTheme.turfGreen),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Booking confirmed',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Your transfer screenshot was received and your reservation is now awaiting review.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white60, fontSize: 14),
                ),
                const SizedBox(height: 24),
                if (qrToken != null && qrToken.isNotEmpty) ...[
                  LiquidGlassCard(
                    borderRadius: 18,
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: [
                        const Text('Booking QR Code', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 14),
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
                                onPressed: () => _copyToClipboard(context, qrToken, 'QR code'),
                                icon: const Icon(Icons.copy, size: 18),
                                label: const Text('Copy QR'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.turfGreen,
                                  foregroundColor: Colors.black,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () => _shareQrHtml(qrToken),
                                icon: const Icon(Icons.share, size: 18),
                                label: const Text('Share QR'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2A2A2A),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                if (trackingCode != null && trackingCode.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  LiquidGlassCard(
                    borderRadius: 16,
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        const Text('Booking Code', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        const SizedBox(height: 8),
                        Text(
                          trackingCode,
                          style: const TextStyle(color: AppTheme.turfGreen, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 1.2),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Use this code in the Track Reservation screen to find your booking.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white60, fontSize: 12),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            ElevatedButton.icon(
                              onPressed: () => _copyToClipboard(context, trackingCode, 'Booking code'),
                              icon: const Icon(Icons.copy, size: 18),
                              label: const Text('Copy Code'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.turfGreen,
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                            const SizedBox(width: 10),
                            OutlinedButton.icon(
                              onPressed: () => _shareValue(trackingCode, 'Booking code'),
                              icon: const Icon(Icons.share, size: 18),
                              label: const Text('Share Code'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Colors.white24),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                if (customerName != null && customerName.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Customer Name: $customerName',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
                if (customerPhone != null && customerPhone.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    'Mobile Number: $customerPhone',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
                if (reservationId != null && reservationId.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    'Reservation ID: $reservationId',
                    style: const TextStyle(color: Colors.white54, fontSize: 13),
                  ),
                ],
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LandingPage()),
                        (route) => false,
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.turfGreen,
                      foregroundColor: Colors.black,
                      elevation: 4,
                      shadowColor: AppTheme.turfGreen.withValues(alpha: 0.4),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.home_outlined),
                    label: const Text('Back to Home', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
}
