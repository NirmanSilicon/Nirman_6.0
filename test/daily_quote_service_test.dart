// Verifies the local quote bank has 365 entries and date selection is repeatable.
import 'package:flutter_test/flutter_test.dart';
import 'package:manas/services/daily_quote_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bundled quote bank has 365 unique entries', () async {
    final quotes = await DailyQuoteService.loadAll();
    expect(quotes, hasLength(365));
    expect(quotes.toSet(), hasLength(365));
  });

  test('same calendar date always selects the same quote', () async {
    final quotes = await DailyQuoteService.loadAll();
    final day = DateTime(2026, 11, 28);
    expect(
      DailyQuoteService.forDate(quotes, day),
      DailyQuoteService.forDate(quotes, DateTime(2026, 11, 28)),
    );
  });
}
