import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_service.dart';
import 'app_language.dart';
import 'app_theme.dart';
import 'booking_page.dart';
import 'court_sport.dart';

class FootballCourtPage extends StatefulWidget {
  final String userId;
  final CourtSport sport;

  const FootballCourtPage({super.key, required this.userId, required this.sport});

  @override
  State<FootballCourtPage> createState() => _FootballCourtPageState();
}

class _FootballCourtPageState extends State<FootballCourtPage> {
  List allCourts = [];
  bool isLoading = true;
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    fetchCourts();
  }

  Future<void> fetchCourts() async {
    setState(() {
      isLoading = true;
      errorMessage = null;
    });
    try {
      final data = await ApiService.getCourts(sportType: widget.sport.apiValue);
      if (!mounted) return;
      setState(() {
        allCourts = data;
        isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        errorMessage = 'Could not fetch courts. Make sure the API is running.';
        isLoading = false;
      });
    }
  }

  Future<void> openLocation(String? value) async {
    if (value == null || value.trim().isEmpty) return;
    final uri = Uri.tryParse(value);
    if (uri == null || !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open the court location.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAr = AppLanguageManager.isArabic;
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        backgroundColor: AppTheme.bg,
        elevation: 0,
        title: Text(isAr ? widget.sport.arabicLabel : "${widget.sport.label} Court"),
      ),
      body: AmbientBackground(
        child: isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.turfGreen))
          : errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(errorMessage!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: fetchCourts,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: AppTheme.liquidGlassDecoration(borderRadius: 14),
                    child: Row(
                      children: [
                        const Icon(Icons.school_rounded, color: AppTheme.turfGreen, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            isAr ? 'ملاعب المدرسة المتاحة للحجز' : 'School Courts Available for Booking',
                            style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: allCourts.isEmpty
                      ? Center(child: Text(isAr ? "لا توجد ملاعب متاحة حالياً" : "No courts available", style: const TextStyle(color: Colors.white60)))
                      : ListView.builder(
                          padding: const EdgeInsets.only(bottom: 20),
                          itemCount: allCourts.length,
                          itemBuilder: (context, index) {
                            final court = allCourts[index];
                            final locationUrl = court['locationUrl']?.toString();
                            final courtId = (court['id'] ?? court['Id'] ?? '').toString();
                            return LiquidGlassCard(
                              margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              padding: const EdgeInsets.all(12),
                              borderRadius: 20,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (courtId.isNotEmpty)
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(14),
                                      child: Image.network(
                                        ApiService.courtImageUrl(courtId),
                                        height: 160,
                                        width: double.infinity,
                                        fit: BoxFit.cover,
                                        headers: {'Accept': 'image/*'},
                                        errorBuilder: (context, error, stackTrace) => Container(
                                          height: 160,
                                          width: double.infinity,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF141414),
                                            borderRadius: BorderRadius.circular(14),
                                            border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                                          ),
                                          alignment: Alignment.center,
                                          child: Icon(
                                            CourtSport.fromApiValue(court['sportType']?.toString()).icon,
                                            size: 50,
                                            color: AppTheme.turfGreen.withValues(alpha: 0.3),
                                          ),
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          (court['Name'] ?? court['name'] ?? "No Name").toString(),
                                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppTheme.turfGreen.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: AppTheme.turfGreen.withValues(alpha: 0.3)),
                                        ),
                                        child: Text(
                                          "${court['price'] ?? "0"} EGP/hr",
                                          style: const TextStyle(color: AppTheme.turfGreen, fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(Icons.location_on_outlined, color: Colors.grey.shade400, size: 16),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          (court['palce'] ?? court['place'] ?? "No Place").toString(),
                                          style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (locationUrl != null && locationUrl.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    TextButton.icon(
                                      onPressed: () => openLocation(locationUrl),
                                      style: TextButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        foregroundColor: AppTheme.turfGreen,
                                      ),
                                      icon: const Icon(Icons.map_outlined, size: 16),
                                      label: const Text('View map location', style: TextStyle(fontSize: 13)),
                                    ),
                                  ],
                                  const SizedBox(height: 12),
                                  Container(
                                    width: double.infinity,
                                    height: 48,
                                    decoration: AppTheme.greenGlowButtonDecoration(borderRadius: 14),
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(14),
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => BookingPage(court: court, userId: widget.userId),
                                            ),
                                          );
                                        },
                                        child: Center(
                                          child: Text(
                                            isAr ? "احجز الآن" : "Book Now",
                                            style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 15),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
      ),
    );
  }
}
