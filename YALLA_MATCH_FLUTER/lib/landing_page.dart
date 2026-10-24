import 'package:flutter/material.dart';

import 'app_theme.dart';
import 'customer_session.dart';
import 'home_page.dart';

const Color _bgColor = AppTheme.bg;
const Color _accentGreen = AppTheme.turfGreen;

class LandingPage extends StatelessWidget {
  const LandingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      body: AmbientBackground(
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 72,
                        height: 72,
                        margin: const EdgeInsets.only(bottom: 16),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    ),
                    RichText(
                      textAlign: TextAlign.center,
                      text: const TextSpan(
                        style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Colors.white),
                        children: [
                          TextSpan(text: 'YALLAH '),
                          TextSpan(text: 'MATCH', style: TextStyle(color: _accentGreen)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Choose how you want to continue',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white60, fontSize: 15),
                    ),
                    const SizedBox(height: 34),
                    _LandingAction(
                      icon: Icons.sports_soccer,
                      title: 'Guest Booking',
                      subtitle: 'Browse courts and reserve a football pitch',
                      onTap: () async {
                        final customerSession = await CustomerSession.getOrCreate();
                        if (!context.mounted) return;
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(builder: (_) => HomePage(userId: customerSession)),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LandingAction extends StatefulWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _LandingAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  State<_LandingAction> createState() => _LandingActionState();
}

class _LandingActionState extends State<_LandingAction> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: LiquidGlassCard(
          borderRadius: 20,
          isSelected: _isHovered,
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppTheme.turfGreen.withValues(alpha: _isHovered ? 0.22 : 0.14),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.turfGreen.withValues(alpha: 0.35)),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.turfGreen.withValues(alpha: _isHovered ? 0.35 : 0.15),
                      blurRadius: _isHovered ? 16 : 8,
                    ),
                  ],
                ),
                child: Icon(widget.icon, color: AppTheme.turfGreen, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(widget.subtitle, style: const TextStyle(color: Colors.white60, fontSize: 13)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: _isHovered ? AppTheme.turfGreen : Colors.white54),
            ],
          ),
        ),
      ),
    );
  }
}
