import 'package:flutter/material.dart';

import 'api_service.dart';
import 'app_theme.dart';
import 'payment_transfer_page.dart';

const Color bg = AppTheme.bg;
const Color green = AppTheme.turfGreen;

class BookingPage extends StatefulWidget {
  final Map court;
  final String userId;

  const BookingPage({
    super.key,
    required this.court,
    required this.userId,
  });

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> {
  Set<String> blocked = {};

  int selectedDay = 0;
  int? selectedHour;
  bool isLoading = true;
  bool isBooking = false;
  String? message;

  final days = List.generate(7, (i) => DateTime.now().add(Duration(days: i)));
  final List<String> dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  @override
  void initState() {
    super.initState();
    fetch();
  }

  Future<void> fetch() async {
    setState(() => isLoading = true);
    try {
      final date = getDate(selectedDay);
      final data = await ApiService.getCourtSlots(
        courtId: widget.court['id'].toString(),
        date: date,
      );
      setState(() {
        blocked.clear();
        for (final slot in data) {
          final status = slot['status']?.toString();
          if (status != 'Available') {
            blocked.add('$date|${slot['hour']}');
          }
        }
        final now = DateTime.now();
        final selectedDate = days[selectedDay];
        final isToday = selectedDate.year == now.year && selectedDate.month == now.month && selectedDate.day == now.day;
        if (isToday) {
          for (var hour = 0; hour <= now.hour; hour++) {
            blocked.add('$date|$hour');
          }
        }
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  bool isBlockedHour(String date, int hour) => blocked.contains("$date|$hour");

  String formatHour(int h) {
    final suffix = h >= 12 ? "PM" : "AM";
    final hour = h % 12 == 0 ? 12 : h % 12;
    return "$hour:00 $suffix";
  }

  String getDate(int dayIndex) => days[dayIndex].toString().split(" ")[0];

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> selectDay(int dayIndex) async {
    setState(() {
      selectedDay = dayIndex;
      selectedHour = null;
      message = null;
    });
    await fetch();
  }

  Future<void> book() async {
    if (selectedHour == null) {
      setState(() => message = "Please select an hour first");
      return;
    }

    final date = getDate(selectedDay);
    if (isBlockedHour(date, selectedHour!)) {
      setState(() => message = "This hour is already booked!");
      return;
    }

    setState(() {
      isBooking = true;
      message = null;
    });

    try {
      final reservation = await ApiService.createReservation(
        courtId: widget.court["id"].toString(),
        customerSessionId: widget.userId,
        date: date,
        from: selectedHour!,
        to: selectedHour!,
      );

      setState(() {
        message = "Reservation created. Upload transfer screenshot.";
        selectedHour = null;
        isBooking = false;
      });

      await fetch();
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => PaymentTransferPage(reservation: reservation, customerSessionId: widget.userId)),
      );
    } catch (e) {
      setState(() {
        message = e.toString().replaceFirst('Exception: ', '');
        isBooking = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final date = getDate(selectedDay);
    final courtName = (widget.court["Name"] ?? widget.court["name"] ?? "Court").toString();
    final courtPrice = (widget.court["price"] ?? 0).toString();

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        title: Text("Booking - $courtName", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(courtPrice, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(width: 4),
                const Text("EGP/hr", style: TextStyle(color: Colors.white54, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
      body: AmbientBackground(
        child: isLoading
            ? const Center(child: CircularProgressIndicator(color: green))
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(left: 18, top: 10, bottom: 8),
                    child: Text("Select Day", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  SizedBox(
                    height: 92,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      itemCount: days.length,
                      itemBuilder: (c, i) {
                        final sel = i == selectedDay;
                        final d = days[i];
                        return GestureDetector(
                          onTap: () => selectDay(i),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 220),
                            width: 68,
                            margin: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
                            decoration: BoxDecoration(
                              color: sel ? AppTheme.turfGreen : const Color(0xFF161C18),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: sel ? AppTheme.turfGreenLight : Colors.white.withValues(alpha: 0.12),
                                width: sel ? 1.5 : 1.0,
                              ),
                              boxShadow: sel
                                  ? [
                                      BoxShadow(
                                        color: AppTheme.turfGreen.withValues(alpha: 0.65),
                                        blurRadius: 20,
                                        spreadRadius: 2,
                                      ),
                                    ]
                                  : [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.40),
                                        blurRadius: 8,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  dayNames[d.weekday % 7],
                                  style: TextStyle(
                                    color: sel ? Colors.black87 : Colors.white60,
                                    fontSize: 12,
                                    fontWeight: sel ? FontWeight.bold : FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  d.day.toString(),
                                  style: TextStyle(
                                    color: sel ? Colors.black : Colors.white,
                                    fontWeight: sel ? FontWeight.w900 : FontWeight.bold,
                                    fontSize: 21,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  width: 16,
                                  height: 2.5,
                                  decoration: BoxDecoration(
                                    color: sel ? Colors.black45 : Colors.white24,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Select Hour", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        Row(
                          children: [
                            _legend(const Color(0xFF261214), const Color(0xFFEF4444), "Booked"),
                            const SizedBox(width: 12),
                            _legend(const Color(0xFF13231A), AppTheme.turfGreen, "Available"),
                            const SizedBox(width: 12),
                            _legend(AppTheme.turfGreen, Colors.black, "Selected"),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: GridView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      itemCount: 24,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 4,
                        childAspectRatio: 2.3,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemBuilder: (c, i) {
                        final bookedHour = isBlockedHour(date, i);
                        final isSelected = selectedHour == i;

                        Color cellBg;
                        Color cellBorder;
                        Color textColor;
                        List<BoxShadow>? shadows;

                        if (bookedHour) {
                          cellBg = const Color(0xFF261214);
                          cellBorder = const Color(0xFF4A1A1E);
                          textColor = const Color(0xFFEF4444).withValues(alpha: 0.55);
                        } else if (isSelected) {
                          cellBg = AppTheme.turfGreen;
                          cellBorder = AppTheme.turfGreenLight;
                          textColor = Colors.black;
                          shadows = [
                            BoxShadow(
                              color: AppTheme.turfGreen.withValues(alpha: 0.70),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ];
                        } else {
                          cellBg = const Color(0xFF13231A);
                          cellBorder = AppTheme.turfGreen.withValues(alpha: 0.35);
                          textColor = const Color(0xFF86EFAC);
                        }

                        return GestureDetector(
                          onTap: bookedHour ? null : () => setState(() => selectedHour = i),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            decoration: BoxDecoration(
                              color: cellBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: cellBorder, width: isSelected ? 1.5 : 1.0),
                              boxShadow: shadows,
                            ),
                            child: Center(
                              child: Text(
                                formatHour(i),
                                style: TextStyle(
                                  color: textColor,
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  if (message != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                      child: Text(message!, style: TextStyle(color: message!.contains("created") ? AppTheme.turfGreen : Colors.red, fontSize: 13)),
                    ),
                  if (selectedHour != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
                      child: Text(
                        "Selected: ${formatHour(selectedHour!)} -> ${formatHour(selectedHour! + 1)}   |   ${widget.court["price"]} EGP",
                        style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Container(
                      width: double.infinity,
                      height: 52,
                      decoration: AppTheme.greenGlowButtonDecoration(borderRadius: 16),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onPressed: isBooking ? null : book,
                          child: Center(
                            child: isBooking
                                ? const CircularProgressIndicator(color: Colors.black)
                                : const Text(
                                    "Create Reservation",
                                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.w800, fontSize: 16),
                                  ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _legend(Color bg, Color border, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(3),
            border: Border.all(color: border, width: 1),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
      ],
    );
  }
}
