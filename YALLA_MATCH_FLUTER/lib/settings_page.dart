import 'package:flutter/material.dart';

import 'app_language.dart';
import 'app_theme.dart';
import 'landing_page.dart';

const Color _bgColor = AppTheme.bg;
const Color _cardBg = AppTheme.darkCard;
const Color _accentGreen = AppTheme.turfGreen;

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  void _showLanguagePicker() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: _cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(builder: (ctx, setModalState) {
          final isAr = AppLanguageManager.isArabic;
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Text(isAr ? 'اختر اللغة' : 'Choose language', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ListTile(
                title: const Text('العربية (Arabic)'),
                trailing: isAr ? const Icon(Icons.check, color: _accentGreen) : null,
                onTap: () {
                  AppLanguageManager.setLanguage('Arabic');
                  setState(() {});
                  Navigator.of(ctx).pop();
                },
              ),
              ListTile(
                title: const Text('English (الإنجليزي)'),
                trailing: !isAr ? const Icon(Icons.check, color: _accentGreen) : null,
                onTap: () {
                  AppLanguageManager.setLanguage('English');
                  setState(() {});
                  Navigator.of(ctx).pop();
                },
              ),
              const SizedBox(height: 12),
            ],
          );
        });
      },
    );
  }

  void _openPolicy(String title, String content) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => PolicyPage(title: title, content: content)));
  }

  void _logout() {
    final isAr = AppLanguageManager.isArabic;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: _cardBg,
        title: Text(isAr ? 'تسجيل الخروج' : 'Log Out', style: const TextStyle(color: Colors.white)),
        content: Text(isAr ? 'هل أنت تأكد من تسجيل الخروج؟' : 'Are you sure you want to log out?', style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(isAr ? 'إلغاء' : 'Cancel', style: const TextStyle(color: Colors.white70)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LandingPage()),
                (route) => false,
              );
            },
            child: Text(isAr ? 'تأكيد' : 'Confirm', style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isAr = AppLanguageManager.isArabic;
    return Scaffold(
      backgroundColor: _bgColor,
      appBar: AppBar(
        backgroundColor: _bgColor,
        elevation: 0,
        title: Text(isAr ? 'الإعدادات' : 'Settings', style: const TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: AmbientBackground(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            LiquidGlassCard(
            borderRadius: 18,
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.language, color: Colors.white),
                  title: Text(isAr ? 'اللغة' : 'Language', style: const TextStyle(color: Colors.white)),
                  subtitle: Text(isAr ? 'العربية' : 'English', style: const TextStyle(color: AppTheme.turfGreen)),
                  onTap: _showLanguagePicker,
                ),
                const Divider(color: Colors.black26, height: 1),
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined, color: Colors.white),
                  title: Text(isAr ? 'سياسة الخصوصية' : 'Privacy Policy', style: const TextStyle(color: Colors.white)),
                  onTap: () => _openPolicy(
                    isAr ? 'سياسة الخصوصية' : 'Privacy Policy',
                    isAr ? 'هذه صفحة سياسة الخصوصية الخاصة بتطبيق يلا ماتش.' : 'This is the Privacy Policy page for YallaMatch.',
                  ),
                ),
                const Divider(color: Colors.black26, height: 1),
                ListTile(
                  leading: const Icon(Icons.article_outlined, color: Colors.white),
                  title: Text(isAr ? 'الشروط والأحكام' : 'Terms & Conditions', style: const TextStyle(color: Colors.white)),
                  onTap: () => _openPolicy(
                    isAr ? 'الشروط والأحكام' : 'Terms & Conditions',
                    isAr ? 'هذه صفحة الشروط والأحكام الخاصة بتطبيق يلا ماتش.' : 'This is the Terms & Conditions page for YallaMatch.',
                  ),
                ),
                const Divider(color: Colors.black26, height: 1),
                ListTile(
                  leading: const Icon(Icons.copyright, color: Colors.white),
                  title: Text(isAr ? 'حقوق النشر' : 'Copyright', style: const TextStyle(color: Colors.white)),
                  subtitle: Text(isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved', style: const TextStyle(color: Colors.grey)),
                  onTap: () => _openPolicy(
                    isAr ? 'حقوق النشر' : 'Copyright',
                    '© 2026 YALLA MATCH. All rights reserved.',
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          TextButton(
            style: TextButton.styleFrom(backgroundColor: Colors.redAccent, padding: const EdgeInsets.symmetric(vertical: 14)),
            onPressed: _logout,
            child: Text(isAr ? 'تسجيل الخروج' : 'Log Out', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          ],
        ),
      ),
    );
  }
}

class PolicyPage extends StatelessWidget {
  final String title;
  final String content;
  const PolicyPage({super.key, required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      appBar: AppBar(
        backgroundColor: _bgColor,
        elevation: 0,
        title: Text(title, style: const TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: AmbientBackground(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: LiquidGlassCard(
            borderRadius: 16,
            padding: const EdgeInsets.all(18),
            child: Text(
              content,
              style: const TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
            ),
          ),
        ),
      ),
    );
  }
}
