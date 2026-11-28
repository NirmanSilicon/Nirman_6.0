// Displays mood history by calendar month and a simple seven-day wellbeing trend.
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/mood_entry.dart';
import '../services/mood_service.dart';
import '../widgets/cyber_background.dart';

class MoodTrackerScreen extends StatefulWidget {
  const MoodTrackerScreen({super.key});

  @override
  State<MoodTrackerScreen> createState() => _MoodTrackerScreenState();
}

class _MoodTrackerScreenState extends State<MoodTrackerScreen> {
  late Future<List<MoodEntry>> _history;
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);

  @override
  void initState() {
    super.initState();
    _history = MoodService.history();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Mood history')),
        body: CyberBackground(
          child: FutureBuilder<List<MoodEntry>>(
            future: _history,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Center(child: Text('Mood history could not load: ${snapshot.error}'));
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final entries = snapshot.data!;
              final byDay = {
                for (final entry in entries) _key(entry.date): entry,
              };
              return ListView(
                padding: const EdgeInsets.all(18),
                children: [
                  _CalendarCard(
                    month: _month,
                    entries: byDay,
                    onMonthChanged: (offset) => setState(() {
                      _month = DateTime(_month.year, _month.month + offset);
                    }),
                  ),
                  const SizedBox(height: 18),
                  Card(
                    color: const Color(0xff0a1a2a).withValues(alpha: .95),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Last 7 recorded check-ins',
                              style: TextStyle(
                                  fontSize: 17, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 20),
                          SizedBox(
                            height: 190,
                            child: _MoodChart(entries: entries),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (_hasFiveLowDays(entries)) ...[
                    const SizedBox(height: 16),
                    Card(
                      color: const Color(0xff352a30),
                      child: const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                          'You have checked in with a low mood for several days. '
                          'Consider talking with someone you trust or a counsellor. '
                          'You do not have to handle it alone.',
                          style: TextStyle(height: 1.45),
                        ),
                      ),
                    ),
                  ],
                  if (entries.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: Text(
                        'Your check-ins will appear here. Choose a mood on the home screen.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      );

  static String _key(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';

  static bool _hasFiveLowDays(List<MoodEntry> entries) {
    final lowDays = {
      for (final entry in entries.where((item) => item.value <= 2))
        DateTime(entry.date.year, entry.date.month, entry.date.day),
    };
    final today = DateTime.now();
    for (var offset = 0; offset < 5; offset++) {
      final date = DateTime(today.year, today.month, today.day - offset);
      if (!lowDays.contains(date)) return false;
    }
    return true;
  }
}

class _CalendarCard extends StatelessWidget {
  const _CalendarCard({
    required this.month,
    required this.entries,
    required this.onMonthChanged,
  });

  final DateTime month;
  final Map<String, MoodEntry> entries;
  final ValueChanged<int> onMonthChanged;

  @override
  Widget build(BuildContext context) {
    final firstWeekday = DateTime(month.year, month.month, 1).weekday % 7;
    final dayCount = DateTime(month.year, month.month + 1, 0).day;
    final cells = <Widget>[
      for (var i = 0; i < firstWeekday; i++) const SizedBox.shrink(),
      for (var day = 1; day <= dayCount; day++)
        _dayCell(context, day),
    ];
    return Card(
      color: const Color(0xff0a1a2a).withValues(alpha: .95),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => onMonthChanged(-1),
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Text(DateFormat.yMMMM().format(month),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w600)),
                ),
                IconButton(
                  onPressed: () => onMonthChanged(1),
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            Row(
              children: [
                for (final label in ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
                  Expanded(
                    child: Center(
                        child: Text(label,
                            style: TextStyle(color: Colors.white54))),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 7,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 4,
              crossAxisSpacing: 2,
              children: cells,
            ),
          ],
        ),
      ),
    );
  }

  Widget _dayCell(BuildContext context, int day) {
    final date = DateTime(month.year, month.month, day);
    final key =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final entry = entries[key];
    return Container(
      decoration: BoxDecoration(
        color: entry == null ? Colors.transparent : const Color(0xff14344a),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('$day', style: const TextStyle(fontSize: 12)),
          if (entry != null)
            Text(entry.emoji, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }
}

class _MoodChart extends StatelessWidget {
  const _MoodChart({required this.entries});
  final List<MoodEntry> entries;

  @override
  Widget build(BuildContext context) {
    final sorted = entries.toList()..sort((a, b) => a.date.compareTo(b.date));
    final recent = sorted.length <= 7
        ? sorted
        : sorted.sublist(sorted.length - 7);
    if (recent.isEmpty) {
      return const Center(
          child: Text('No mood data yet', style: TextStyle(color: Colors.white54)));
    }
    return LineChart(
      LineChartData(
        minY: 1,
        maxY: 5,
        gridData: const FlGridData(show: true, drawVerticalLine: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
              reservedSize: 36,
              getTitlesWidget: (value, meta) => Text(
                _emoji(value.round()),
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index < 0 || index >= recent.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 7),
                  child: Text(DateFormat.E().format(recent[index].date),
                      style: const TextStyle(fontSize: 10)),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false)),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: [
              for (var i = 0; i < recent.length; i++)
                FlSpot(i.toDouble(), recent[i].value.toDouble()),
            ],
            isCurved: true,
            color: const Color(0xff58dfff),
            barWidth: 3,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(
                show: true,
                color: const Color(0xff32c8ee).withValues(alpha: .12)),
          ),
        ],
      ),
    );
  }

  static String _emoji(int value) =>
      const ['😞', '😕', '😐', '🙂', '😊'][value.clamp(1, 5).toInt() - 1];
}
