// Shows the daily quote, mood check-in, and ordinary-looking feature launcher.
import 'package:flutter/material.dart';
import '../models/mood_entry.dart';
import '../models/user_profile.dart';
import '../services/auth_service.dart';
import '../services/daily_quote_service.dart';
import '../services/mood_service.dart';
import '../services/profile_service.dart';
import '../widgets/cyber_background.dart';
import 'auth_screen.dart';
import 'mood_tracker_screen.dart';
import 'sos_screen.dart';
import 'zedtron_entry_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  static const _moods = ['😞', '😕', '😐', '🙂', '😊'];
  late Future<UserProfile?> _profile;
  String? _quote;
  String? _selectedMood;

  @override
  void initState() {
    super.initState();
    _profile = ProfileService.load();
    _loadQuote();
    _loadTodayMood();
  }

  Future<void> _loadTodayMood() async {
    try {
      final history = await MoodService.history();
      final today = DateTime.now();
      final todayEntry = history.where((entry) =>
          entry.date.year == today.year &&
          entry.date.month == today.month &&
          entry.date.day == today.day);
      if (mounted && todayEntry.isNotEmpty) {
        setState(() => _selectedMood = todayEntry.first.emoji);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Today’s mood could not be loaded: $error')),
        );
      }
    }
  }

  Future<void> _loadQuote() async {
    final quotes = await DailyQuoteService.loadAll();
    if (mounted) {
      setState(() => _quote = DailyQuoteService.forDate(quotes, DateTime.now()));
    }
  }

  Future<void> _selectMood(String emoji) async {
    final moodIndex = _moods.indexOf(emoji);
    try {
      await MoodService.save(MoodEntry(
        date: DateTime.now(),
        emoji: emoji,
        value: moodIndex + 1,
      ));
      if (mounted) setState(() => _selectedMood = emoji);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Mood could not be saved: $error')),
        );
      }
    }
  }

  Future<void> _open(Widget page) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => page),
    );
  }

  Future<void> _settings() async {
    final profile = await ProfileService.load();
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xff101c2c),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Settings',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Text('Trusted contact: ${profile?.proxyPhone ?? 'Not set'}'),
              const SizedBox(height: 16),
              const Text(
                'Your location is requested only when you activate SOS.',
                style: TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 18),
              OutlinedButton(
                onPressed: () async {
                  await AuthService.signOut();
                  if (!mounted || !context.mounted) return;
                  Navigator.of(context).pop();
                  Navigator.of(this.context).pushAndRemoveUntil(
                    MaterialPageRoute<void>(
                        builder: (_) => const AuthScreen()),
                    (_) => false,
                  );
                },
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: CyberBackground(
          child: SafeArea(
            child: FutureBuilder<UserProfile?>(
              future: _profile,
              builder: (context, snapshot) {
                final name = snapshot.data?.name ?? 'there';
                return CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          Row(
                            children: [
                              const Icon(Icons.memory,
                                  color: Color(0xff46d8ff), size: 30),
                              const SizedBox(width: 8),
                              const Text('MANAS',
                                  style: TextStyle(
                                      letterSpacing: 4,
                                      fontWeight: FontWeight.bold)),
                              const Spacer(),
                              IconButton(
                                onPressed: _settings,
                                icon: const Icon(Icons.settings_outlined),
                                tooltip: 'Settings',
                              ),
                            ],
                          ),
                          const SizedBox(height: 18),
                          Text('Hello, $name',
                              style: const TextStyle(
                                  fontSize: 25, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 14),
                          _QuoteCard(quote: _quote),
                          const SizedBox(height: 18),
                          Card(
                            color:
                                const Color(0xff0a1a2a).withValues(alpha: .92),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('How are you feeling?',
                                      style: TextStyle(
                                          fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 14),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: _moods
                                        .map((mood) => InkWell(
                                              onTap: () => _selectMood(mood),
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                              child: AnimatedContainer(
                                                duration: const Duration(
                                                    milliseconds: 180),
                                                padding:
                                                    const EdgeInsets.all(9),
                                                decoration: BoxDecoration(
                                                  color: _selectedMood == mood
                                                      ? const Color(0xff174f68)
                                                      : Colors.transparent,
                                                  borderRadius:
                                                      BorderRadius.circular(18),
                                                ),
                                                child: Text(mood,
                                                    style: const TextStyle(
                                                        fontSize: 27)),
                                              ),
                                            ))
                                        .toList(),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 22),
                          const Text('Your space',
                              style: TextStyle(
                                  fontSize: 19, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 12),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final width = (constraints.maxWidth - 14) / 2;
                              return Wrap(
                                spacing: 14,
                                runSpacing: 14,
                                children: [
                                  _FeatureTile(
                                    width: width,
                                    title: 'SOS',
                                    subtitle: 'Quick safety',
                                    icon: Icons.shield_outlined,
                                    color: const Color(0xffff5364),
                                    onTap: () => _open(const SosScreen()),
                                  ),
                                  _FeatureTile(
                                    width: width,
                                    title: 'Zedtron AI',
                                    subtitle: 'Talk it through',
                                    icon: Icons.blur_on,
                                    color: const Color(0xff61dfff),
                                    onTap: () =>
                                        _open(const ZedtronEntryScreen()),
                                  ),
                                  _FeatureTile(
                                    width: width,
                                    title: 'Mood Tracker',
                                    subtitle: 'Your wellbeing',
                                    icon: Icons.insights_outlined,
                                    color: const Color(0xffbc9cff),
                                    onTap: () =>
                                        _open(const MoodTrackerScreen()),
                                  ),
                                  _FeatureTile(
                                    width: width,
                                    title: 'Daily Quote',
                                    subtitle: 'A gentle reminder',
                                    icon: Icons.auto_awesome_outlined,
                                    color: const Color(0xffffcf6d),
                                    onTap: () => _showQuote(context),
                                  ),
                                  _FeatureTile(
                                    width: width,
                                    title: 'Contacts',
                                    subtitle: 'Trusted person',
                                    icon: Icons.people_outline,
                                    color: const Color(0xff67e5c1),
                                    onTap: _settings,
                                  ),
                                  _FeatureTile(
                                    width: width,
                                    title: 'Settings',
                                    subtitle: 'Your preferences',
                                    icon: Icons.tune,
                                    color: const Color(0xff94adff),
                                    onTap: _settings,
                                  ),
                                ],
                              );
                            },
                          ),
                        ]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );

  void _showQuote(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Quote of the Day'),
        content: Text(_quote ?? 'A little patience with yourself is progress.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _QuoteCard extends StatelessWidget {
  const _QuoteCard({required this.quote});
  final String? quote;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xff31bfe8).withValues(alpha: .4)),
          gradient: const LinearGradient(
            colors: [Color(0xff10304a), Color(0xff11162d)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('QUOTE OF THE DAY',
                style: TextStyle(
                    color: Color(0xff69dcff),
                    fontSize: 11,
                    letterSpacing: 1.8)),
            const SizedBox(height: 10),
            Text(
              quote ?? 'A little patience with yourself is progress.',
              style: const TextStyle(fontSize: 17, height: 1.4),
            ),
          ],
        ),
      );
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.width,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final double width;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: width,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Ink(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: const Color(0xff0b1725).withValues(alpha: .95),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: color.withValues(alpha: .24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: color, size: 28),
                const SizedBox(height: 13),
                Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 3),
                Text(subtitle,
                    style: const TextStyle(
                        color: Colors.white60, fontSize: 12)),
              ],
            ),
          ),
        ),
      );
}
