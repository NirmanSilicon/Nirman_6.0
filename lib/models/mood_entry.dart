// Represents a single mood selection stored locally and, when enabled, in Firestore.
class MoodEntry {
  const MoodEntry({
    required this.date,
    required this.emoji,
    required this.value,
  });

  final DateTime date;
  final String emoji;
  final int value;

  Map<String, Object> toJson() => {
        'date': date.toIso8601String(),
        'emoji': emoji,
        'value': value,
      };

  factory MoodEntry.fromJson(Map<String, dynamic> json) => MoodEntry(
        date: DateTime.parse(json['date'] as String),
        emoji: json['emoji'] as String,
        value: json['value'] as int,
      );
}
