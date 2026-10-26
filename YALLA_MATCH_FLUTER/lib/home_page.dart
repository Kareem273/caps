import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
                // Top Header Row
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
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
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
                        onPressed: () {
                          HapticFeedback.lightImpact();
                          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsPage()));
                        },
                        icon: const Icon(Icons.settings_outlined, color: Colors.white, size: 22),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 25),

                // Booking Tracker Card
                const BookingTracker(),

                const SizedBox(height: 32),

                // Section Title
                Text(
                  isAr ? 'ملاعب المدرسة' : 'School Courts',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white70),
                ),
                const SizedBox(height: 16),

                // Vertical Stack of Court Types (فوق بعضها)
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: CourtSport.values.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 14),
                  itemBuilder: (context, index) {
                    final sport = CourtSport.values[index];
                    final label = isAr ? sport.arabicLabel : sport.label;
                    final subtitle = sport == CourtSport.soccer
                        ? (isAr ? 'ملاعب كرة قدم معتمدة • نجيل صناعي وطبيعي' : 'Certified Football Pitches • Natural & Turf')
                        : (isAr ? 'كرة سلة، طائرة، يد، وتنس • صالات وملاعب' : 'Basketball, Volleyball & Multipurpose Courts');

                    return CategoryCard(
                      title: label,
                      subtitle: subtitle,
                      icon: sport.icon,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => FootballCourtPage(userId: widget.userId, sport: sport),
                          ),
                        );
                      },
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

class BookingTracker extends StatefulWidget {
  const BookingTracker({super.key});

  @override
  State<BookingTracker> createState() => _BookingTrackerState();
}

class _BookingTrackerState extends State<BookingTracker> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isAr = AppLanguageManager.isArabic;
    return GestureDetector(
      onTapDown: (_) {
        HapticFeedback.lightImpact();
        setState(() => _isPressed = true);
      },
      onTapUp: (_) {
        setState(() => _isPressed = false);
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ReservationTrackingPage()));
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedScale(
        scale: _isPressed ? 0.98 : 1.0,
        duration: const Duration(milliseconds: 130),
        curve: Curves.easeOutCubic,
        child: LiquidGlassCard(
          borderRadius: 24,
          isSelected: _isPressed,
          borderColor: _isPressed ? AppTheme.turfGreen : null,
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
        ),
      ),
    );
  }
}

class CategoryCard extends StatefulWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const CategoryCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  @override
  State<CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<CategoryCard> {
  bool _isPressed = false;

  void _handleTapDown(TapDownDetails _) {
    HapticFeedback.lightImpact();
    setState(() => _isPressed = true);
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() => _isPressed = false);
    widget.onTap();
  }

  void _handleTapCancel() {
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: AnimatedScale(
        scale: _isPressed ? 0.965 : 1.0,
        duration: const Duration(milliseconds: 130),
        curve: Curves.easeOutCubic,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          child: LiquidGlassCard(
            borderRadius: 22,
            isSelected: _isPressed,
            glow: _isPressed,
            borderColor: _isPressed ? AppTheme.turfGreen : null,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
            child: Stack(
              clipBehavior: Clip.antiAlias,
              children: [
                // Faint watermark icon in background
                Positioned(
                  bottom: -20,
                  right: -15,
                  child: Opacity(
                    opacity: _isPressed ? 0.08 : 0.04,
                    child: Transform.rotate(
                      angle: 0.20,
                      child: Icon(widget.icon, size: 100, color: Colors.white),
                    ),
                  ),
                ),
                Row(
                  children: [
                    // Glowing Neon Icon
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 54,
                          height: 54,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppTheme.turfGreen.withValues(alpha: _isPressed ? 0.25 : 0.15),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.turfGreen.withValues(alpha: _isPressed ? 0.70 : 0.45),
                                blurRadius: _isPressed ? 30 : 22,
                                spreadRadius: _isPressed ? 4 : 2,
                              ),
                            ],
                          ),
                        ),
                        Icon(widget.icon, color: AppTheme.turfGreenLight, size: 36),
                      ],
                    ),
                    const SizedBox(width: 16),
                    // Titles
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            widget.subtitle,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: Colors.white60,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Trailing Action Arrow Pill
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: _isPressed
                            ? AppTheme.turfGreen.withValues(alpha: 0.25)
                            : AppTheme.turfGreen.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.turfGreen.withValues(alpha: _isPressed ? 0.60 : 0.30),
                        ),
                      ),
                      child: const Icon(
                        Icons.chevron_right_rounded,
                        color: AppTheme.turfGreen,
                        size: 22,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
