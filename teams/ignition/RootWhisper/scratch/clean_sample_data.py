import re

with open('frontend/src/data/sampleData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace SAMPLE_TIME_SERIES = [ ... ]; with []
content = re.sub(
    r'export const SAMPLE_TIME_SERIES: TimeSeriesReading\[\] = \[[\s\S]*?\n\];',
    'export const SAMPLE_TIME_SERIES: TimeSeriesReading[] = [];',
    content
)

# 2. Replace getPlantSensorHistory implementation to return []
content = re.sub(
    r'export function getPlantSensorHistory\([\s\S]*?\n\}: PlantSensorHistoryPoint\[\] \{[\s\S]*?\n\}',
    '''export function getPlantSensorHistory(
  plantId: string,
  timeframe: '1h' | '24h' | '7d' | '30d' | string
): PlantSensorHistoryPoint[] {
  return [];
}''',
    content
)

# 3. Replace SAMPLE_ENVIRONMENTAL_CORRELATIONS
content = re.sub(
    r'export const SAMPLE_ENVIRONMENTAL_CORRELATIONS: EnvironmentalCorrelationPoint\[\] = \[[\s\S]*?\n\];',
    'export const SAMPLE_ENVIRONMENTAL_CORRELATIONS: EnvironmentalCorrelationPoint[] = [];',
    content
)

# 4. Replace SAMPLE_ANOMALY_PERIODS
content = re.sub(
    r'export const SAMPLE_ANOMALY_PERIODS: PersistentAnomalyPeriod\[\] = \[[\s\S]*?\n\];',
    'export const SAMPLE_ANOMALY_PERIODS: PersistentAnomalyPeriod[] = [];',
    content
)

# 5. Replace SCREENING_OUTCOME_DISTRIBUTION
content = re.sub(
    r'export const SCREENING_OUTCOME_DISTRIBUTION: ScreeningDistributionItem\[\] = \[[\s\S]*?\n\];',
    'export const SCREENING_OUTCOME_DISTRIBUTION: ScreeningDistributionItem[] = [];',
    content
)

# 6. Replace SAMPLE_SCREENING_HISTORY
content = re.sub(
    r'export const SAMPLE_SCREENING_HISTORY: ScreeningHistoryRecord\[\] = \[[\s\S]*?\n\];',
    'export const SAMPLE_SCREENING_HISTORY: ScreeningHistoryRecord[] = [];',
    content
)

with open('frontend/src/data/sampleData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated sampleData.ts successfully.")

