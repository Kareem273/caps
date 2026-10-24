import 'package:flutter/material.dart';

import 'api_service.dart';
import 'app_theme.dart';
import 'payment_transfer_page.dart';

const Color bg = AppTheme.bg;
const Color card = AppTheme.darkCard;
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

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        title: Text((widget.court["Name"] ?? widget.court["name"] ?? "Booking").toString(), style: const TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: AmbientBackground(
        child: isLoading
            ? const Center(child: CircularProgressIndicator(color: green))
            : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    "${widget.court["palce"] ?? widget.court["place"] ?? ""} - ${widget.court["price"]} EGP/hr",
                    style: const TextStyle(color: Colors.white60, fontSize: 13),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(left: 16, top: 8, bottom: 4),
                  child: Text("Select Day", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                ),
                SizedBox(
                  height: 72,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: days.length,
                    itemBuilder: (c, i) {
                      final sel = i == selectedDay;
                      final d = days[i];
                      return GestureDetector(
                        onTap: () => selectDay(i),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 62,
                          margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                          decoration: AppTheme.liquidGlassDecoration(
                            borderRadius: 14,
                            isSelected: sel,
                            fillColor: sel
                                ? AppTheme.turfGreen
                                : const Color(0xFF141414).withValues(alpha: 0.70),
                            borderColor: sel
                                ? AppTheme.turfGreen
                                : Colors.white.withValues(alpha: 0.08),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(dayNames[d.weekday % 7], style: TextStyle(color: sel ? Colors.black : Colors.white60, fontSize: 11, fontWeight: sel ? FontWeight.bold : FontWeight.normal)),
                              const SizedBox(height: 4),
                              Text(d.day.toString(), style: TextStyle(color: sel ? Colors.black : Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                    ],
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.only(left: 16, top: 12, bottom: 4),
                  child: Text("Select Hour", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 16, bottom: 8),
                  child: Row(
                    children: [
                      _legend(Colors.red.shade900.withValues(alpha: 0.6), "Unavailable"),
                      const SizedBox(width: 16),
                      _legend(AppTheme.turfGreen.withValues(alpha: 0.8), "Available"),
                      const SizedBox(width: 16),
                      _legend(AppTheme.turfGreen, "Selected"),
                    ],
                  ),
                ),
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    itemCount: 24,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 4,
                      childAspectRatio: 3.2,
                      crossAxisSpacing: 6,
                      mainAxisSpacing: 6,
                    ),
                    itemBuilder: (c, i) {
                      final bookedHour = isBlockedHour(date, i);
                      final isSelected = selectedHour == i;

                      Color cellBg;
                      Color cellBorder;
                      Color textColor;
                      if (bookedHour) {
                        cellBg = Colors.red.shade900.withValues(alpha: 0.22);
                        cellBorder = Colors.red.shade900.withValues(alpha: 0.45);
                        textColor = Colors.white38;
                      } else if (isSelected) {
                        cellBg = AppTheme.turfGreen;
                        cellBorder = AppTheme.turfGreenLight;
                        textColor = Colors.black;
                      } else {
                        cellBg = AppTheme.turfGreen.withValues(alpha: 0.12);
                        cellBorder = AppTheme.turfGreen.withValues(alpha: 0.35);
                        textColor = AppTheme.turfGreen;
                      }

                      return GestureDetector(
                        onTap: bookedHour ? null : () => setState(() => selectedHour = i),
                        child: Container(
                          decoration: BoxDecoration(
                            color: cellBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: cellBorder, width: isSelected ? 1.5 : 1.0),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(color: AppTheme.turfGreen.withValues(alpha: 0.40), blurRadius: 10),
                                  ]
                                : null,
                          ),
                          child: Center(
                            child: Text(formatHour(i), style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.w700)),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                if (message != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Text(message!, style: TextStyle(color: message!.contains("created") ? AppTheme.turfGreen : Colors.red, fontSize: 13)),
                  ),
                if (selectedHour != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Text(
                      "Selected: ${formatHour(selectedHour!)} -> ${formatHour(selectedHour! + 1)}   |   ${widget.court["price"]} EGP",
                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.turfGreen,
                        foregroundColor: Colors.black,
                        elevation: 4,
                        shadowColor: AppTheme.turfGreen.withValues(alpha: 0.4),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: isBooking ? null : book,
                      child: isBooking
                          ? const CircularProgressIndicator(color: Colors.black)
                          : const Text("Create Reservation", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                ),
              ],
            ),
      ),
    );
  }

  Widget _legend(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}
