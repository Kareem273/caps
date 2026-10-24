import 'package:flutter/material.dart';

import 'app_language.dart';
import 'football_court.dart';
import 'court_sport.dart';
import 'reservation_tracking_page.dart';
import 'settings_page.dart';

import 'app_theme.dart';

const Color _bgColor = AppTheme.bg;

class HomePage extends StatefulWidget {
  final String userId;

  const HomePage({super.key, required this.userId});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  Widget build(BuildContext context) {
    final isAr = AppLanguageManager.isArabic;
    return Scaffold(
      backgroundColor: _bgColor,
      body: AmbientBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ClipOval(
                          child: Image.asset(
                            'assets/images/logo.png',
                            width: 32,
                            height: 32,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(width: 10),
                        RichText(
                          text: const TextSpan(
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                            children: [
                              TextSpan(text: 'YALLAH '),
                              TextSpan(text: 'MATCH', style: TextStyle(color: AppTheme.turfGreen)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsPage())),
                      icon: const Icon(Icons.settings_outlined, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 25),
                GestureDetector(
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReservationTrackingPage())),
                  child: const BookingTracker(),
                ),
                const SizedBox(height: 30),
                Text(
                  isAr ? 'ملاعب المدرسة' : 'School Courts',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey),
                ),
                const SizedBox(height: 15),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: CourtSport.values.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.15,
                  ),
                  itemBuilder: (context, index) {
                    final sport = CourtSport.values[index];
                    final label = isAr ? sport.arabicLabel : sport.label;
                    return GestureDetector(
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => FootballCourtPage(userId: widget.userId, sport: sport),
                        ),
                      ),
                      child: CategoryCard(title: label, icon: sport.icon),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class BookingTracker extends StatelessWidget {
  const BookingTracker({super.key});

  @override
  Widget build(BuildContext context) {
    final isAr = AppLanguageManager.isArabic;
    return LiquidGlassCard(
      borderRadius: 20,
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isAr ? 'تتبع حجزي' : 'FOLLOW MY BOOKING',
                style: const TextStyle(color: Color(0xFF888888), fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              Text(
                isAr ? 'تتبع باستخدام كود الحجز' : 'Track with reservation code',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.turfGreen.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.turfGreen.withValues(alpha: 0.35), width: 1),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.turfGreen.withValues(alpha: 0.20),
                  blurRadius: 10,
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Text(
              isAr ? 'تتبع' : 'Track',
              style: const TextStyle(color: AppTheme.turfGreen, fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

class CategoryCard extends StatefulWidget {
  final String title;
  final IconData icon;

  const CategoryCard({super.key, required this.title, required this.icon});

  @override
  State<CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<CategoryCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
        transform: _isHovered ? Matrix4.translationValues(0, -6, 0) : Matrix4.identity(),
        child: LiquidGlassCard(
          borderRadius: 24,
          isSelected: _isHovered,
          borderColor: _isHovered ? AppTheme.turfGreen : null,
          child: Stack(
            clipBehavior: Clip.antiAlias,
            children: [
              Positioned(
                bottom: -15,
                right: -15,
                child: Opacity(
                  opacity: _isHovered ? 0.20 : 0.07,
                  child: Transform.rotate(
                    angle: _isHovered ? 0.35 : 0,
                    child: Icon(widget.icon, size: 90, color: Colors.white),
                  ),
                ),
              ),
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.turfGreen.withValues(alpha: _isHovered ? 0.22 : 0.12),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.turfGreen.withValues(alpha: _isHovered ? 0.45 : 0.20),
                            blurRadius: _isHovered ? 20 : 12,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Icon(widget.icon, color: AppTheme.turfGreen, size: 36),
                    ),
                    const SizedBox(height: 12),
                    Text(widget.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
