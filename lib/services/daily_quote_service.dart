// Loads the bundled 365-quote collection and chooses an entry by day of year.
import 'dart:convert';
import 'package:flutter/services.dart';

class DailyQuoteService {
  static Future<List<String>> loadAll() async {
    final json = await rootBundle.loadString('assets/data/daily_quotes.json');
    return (jsonDecode(json) as List<dynamic>).cast<String>();
  }

  static String forDate(List<String> quotes, DateTime date) {
    if (quotes.length != 365) {
      throw StateError('The daily quote collection must contain 365 quotes.');
    }
    final startOfYear = DateTime(date.year);
    final dayIndex = date.difference(startOfYear).inDays;
    return quotes[dayIndex % quotes.length];
  }
}
