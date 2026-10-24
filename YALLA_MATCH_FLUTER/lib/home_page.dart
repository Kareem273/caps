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
                            width: 34,
                            height: 34,
                            fit: BoxFit.cover,
                          ),
                        ),
                        const SizedBox(width: 12),
                        RichText(
                          text: const TextSpan(
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5),
                            children: [
                              TextSpan(text: 'YALLAH '),
                              TextSpan(
                                text: 'MATCH',
                                style: TextStyle(
                                  color: AppTheme.turfGreen,
                                  shadows: [
                                    Shadow(color: Color(0x9922C55E), blurRadius: 18),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    Container(
                      decoration: AppTheme.liquidGlassDecoration(borderRadius: 14),
                      child: IconButton(
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsPage())),
                        icon: const Icon(Icons.settings_outlined, color: Colors.white, size: 22),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 25),
                GestureDetector(
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReservationTrackingPage())),
                  child: const BookingTracker(),
                ),
                const SizedBox(height: 32),
                Text(
                  isAr ? 'ملاعب المدرسة' : 'Choose a sport',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white70),
                ),
                const SizedBox(height: 16),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: CourtSport.values.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 14,
                    crossAxisSpacing: 14,
                    childAspectRatio: 1.08,
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
      borderRadius: 24,
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isAr ? 'تتبع حجزي' : 'FOLLOW MY BOOKING',
                  style: const TextStyle(
                    color: Color(0xFF8E9590),
                    fontSize: 11,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  isAr ? 'تتبع باستخدام كود الحجز' : 'Track with reservation code',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF132219),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.turfGreen.withValues(alpha: 0.45)),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.turfGreen.withValues(alpha: 0.25),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Text(
              isAr ? 'تتبع' : 'Track',
              style: const TextStyle(color: AppTheme.turfGreen, fontSize: 13, fontWeight: FontWeight.bold),
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
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
        transform: _isHovered ? Matrix4.translationValues(0, -6, 0) : Matrix4.identity(),
        child: LiquidGlassCard(
          borderRadius: 24,
          isSelected: _isHovered,
          borderColor: _isHovered ? AppTheme.turfGreen : null,
          child: Stack(
            clipBehavior: Clip.antiAlias,
            children: [
              // Faint watermark icon in bottom-right matching mockup
              Positioned(
                bottom: -15,
                right: -15,
                child: Opacity(
                  opacity: _isHovered ? 0.08 : 0.045,
                  child: Transform.rotate(
                    angle: _isHovered ? 0.30 : 0.15,
                    child: Icon(widget.icon, size: 105, color: Colors.white),
                  ),
                ),
              ),
              // Centered glowing neon icon + title
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        // Radial neon glow bloom behind the icon
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.turfGreen.withValues(alpha: 0.15),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.turfGreen.withValues(alpha: _isHovered ? 0.70 : 0.50),
                                blurRadius: _isHovered ? 34 : 26,
                                spreadRadius: _isHovered ? 6 : 3,
                              ),
                            ],
                          ),
                        ),
                        Icon(widget.icon, color: AppTheme.turfGreenLight, size: 44),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      widget.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.3,
                      ),
                    ),
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
