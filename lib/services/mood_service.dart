// Saves one mood per calendar day and supplies history for the mood screen.
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/mood_entry.dart';
import 'auth_service.dart';
import 'crypto_service.dart';

class MoodService {
  static const _key = 'manas_mood_entries';

  static Future<List<MoodEntry>> history() async {
    final uid = await AuthService.userId();
    if (uid == null) return [];
    final prefs = await SharedPreferences.getInstance();
    final encrypted = prefs.getString('$_key:$uid');
    if (encrypted == null) return [];
    final list = jsonDecode(await CryptoService.decryptText(encrypted))
        as List<dynamic>;
    return list
        .map((item) => MoodEntry.fromJson(item as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.date.compareTo(b.date));
  }

  static Future<void> save(MoodEntry entry) async {
    final uid = await AuthService.userId();
    if (uid == null) throw StateError('No signed-in account.');
    final entries = await history();
    final day = _dayKey(entry.date);
    entries.removeWhere((item) => _dayKey(item.date) == day);
    entries.add(entry);
    final prefs = await SharedPreferences.getInstance();
    final encrypted = await CryptoService.encryptText(
      jsonEncode(entries.map((item) => item.toJson()).toList()),
    );
    await prefs.setString(
      '$_key:$uid',
      encrypted,
    );
    if (AuthService.firebaseEnabled) {
      final encryptedMood = await CryptoService.encryptText(jsonEncode({
        'emoji': entry.emoji,
        'value': entry.value,
        'date': entry.date.toIso8601String(),
      }));
      await FirebaseFirestore.instance
          .collection('users')
          .doc(uid)
          .collection('moods')
          .doc(day)
          .set({
        'encryptedMood': encryptedMood,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }
  }

  static String _dayKey(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';
}
