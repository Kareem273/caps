import 'dart:ui';
import 'package:flutter/material.dart';

/// YallaMatch Design System
/// Liquid Glass styling with Turf Grass Green (لون النجيلة)
/// Matched exactly to the visual mockups
class AppTheme {
  // Backgrounds
  static const Color bg = Color(0xFF050505);
  static const Color darkCard = Color(0xFF0F1210);

  // Turf Grass Green - لون النجيلة الرياضية الحيوية
  static const Color turfGreen = Color(0xFF22C55E);
  static const Color turfGreenDark = Color(0xFF16A34A);
  static const Color turfGreenLight = Color(0xFF4ADE80);

  // Elsewedy Brand Red
  static const Color elsewedyRed = Color(0xFFE40000);

  // Glass Colors
  static Color glassBg = const Color(0xFF141916).withValues(alpha: 0.75);
  static Color glassBorder = Colors.white.withValues(alpha: 0.13);
  static Color glassBorderGlow = const Color(0xFF22C55E).withValues(alpha: 0.85);

  /// Atmospheric background with subtle deep turf green ambient glows
  static BoxDecoration ambientBackgroundDecoration() {
    return const BoxDecoration(
      color: bg,
      gradient: RadialGradient(
        center: Alignment(0.65, -0.65),
        radius: 1.35,
        colors: [
          Color(0x2222C55E), // Subtle dark emerald aura
          Color(0x0822C55E),
          Color(0xFF050505),
        ],
        stops: [0.0, 0.45, 1.0],
      ),
    );
  }

  /// Standard Liquid Glass Box Decoration matching the mockup
  static BoxDecoration liquidGlassDecoration({
    double borderRadius = 20,
    bool isSelected = false,
    Color? borderColor,
    Color? fillColor,
    double borderWidth = 1.0,
    bool glow = false,
  }) {
    return BoxDecoration(
      color: fillColor,
      gradient: fillColor != null
          ? null
          : (isSelected
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    turfGreen.withValues(alpha: 0.28),
                    const Color(0xFF0E1511).withValues(alpha: 0.92),
                  ],
                )
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xDB202823), // Sleek subtle top-left glass highlight
                    Color(0xEB121714), // Deep smoked body
                    Color(0xF50B0F0D), // Dark bottom-right
                  ],
                  stops: [0.0, 0.45, 1.0],
                )),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderColor ??
            (isSelected
                ? turfGreen.withValues(alpha: 0.90)
                : Colors.white.withValues(alpha: 0.13)),
        width: isSelected ? 1.5 : borderWidth,
      ),
      boxShadow: [
        if (isSelected || glow) ...[
          BoxShadow(
            color: turfGreen.withValues(alpha: 0.35),
            blurRadius: 20,
            spreadRadius: 1,
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.55),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ] else ...[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.45),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ],
    );
  }

  /// Neon Turf Green Button Decoration matching the mockup
  static BoxDecoration greenGlowButtonDecoration({double borderRadius = 16}) {
    return BoxDecoration(
      color: turfGreen,
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow: [
        BoxShadow(
          color: turfGreen.withValues(alpha: 0.55),
          blurRadius: 22,
          spreadRadius: 1,
        ),
      ],
    );
  }
}

/// Atmospheric Ambient Background Wrapper
class AmbientBackground extends StatelessWidget {
  final Widget child;

  const AmbientBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: AppTheme.ambientBackgroundDecoration(),
      child: child,
    );
  }
}

/// Reusable Liquid Glass Container with Frosted Blur and Outer Glow
class LiquidGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final bool isSelected;
  final Color? borderColor;
  final Color? fillColor;
  final double blur;
  final bool glow;

  const LiquidGlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderRadius = 20,
    this.isSelected = false,
    this.borderColor,
    this.fillColor,
    this.blur = 14,
    this.glow = false,
  });

  @override
  Widget build(BuildContext context) {
    Widget card = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          if (isSelected || glow) ...[
            BoxShadow(
              color: AppTheme.turfGreen.withValues(alpha: 0.35),
              blurRadius: 20,
              spreadRadius: 1,
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.55),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ] else ...[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.45),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              color: fillColor,
              gradient: fillColor != null
                  ? null
                  : (isSelected
                      ? LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            AppTheme.turfGreen.withValues(alpha: 0.28),
                            const Color(0xFF0E1511).withValues(alpha: 0.92),
                          ],
                        )
                      : const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color(0xDB202823),
                            Color(0xEB121714),
                            Color(0xF50B0F0D),
                          ],
                          stops: [0.0, 0.45, 1.0],
                        )),
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: borderColor ??
                    (isSelected
                        ? AppTheme.turfGreen.withValues(alpha: 0.90)
                        : Colors.white.withValues(alpha: 0.13)),
                width: isSelected ? 1.5 : 1.0,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );

    if (margin != null) {
      card = Padding(padding: margin!, child: card);
    }

    return card;
  }
}
