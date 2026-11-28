export type ComparisonStatus =
  | 'consistent'
  | 'possible_discrepancy'
  | 'insufficient_evidence'
  | 'requires_inspection'
  | 'verified_by_officer';

export interface ApprovedSpecsInput {
  length_m?: number | null;
  width_m?: number | null;
  area_sqm?: number | null;
  thickness_mm?: number | null;
}

export interface SurveyInput {
  measured_length_m?: number | null;
  measured_width_m?: number | null;
  measured_area_sqm?: number | null;
  measured_thickness_mm?: number | null;
  survey_date?: string;
  method?: string;
}

export interface ComputedComparison {
  metric_name: string;
  official_value: number | null;
  measured_value: number | null;
  unit: string;
  difference_value: number | null;
  coverage_pct: number | null;
  result_status: ComparisonStatus;
  limitations: string;
  source_summary: string;
}

function evaluateMetric(
  metricName: string,
  officialValue: number | null | undefined,
  measuredValue: number | null | undefined,
  unit: string,
  surveyDate: string,
  method: string
): ComputedComparison | null {
  const hasOfficial = typeof officialValue === 'number' && officialValue > 0;
  const hasMeasured = typeof measuredValue === 'number' && measuredValue >= 0;

  if (!hasOfficial && !hasMeasured) {
    return null;
  }

  if (!hasOfficial || !hasMeasured) {
    return {
      metric_name: metricName,
      official_value: hasOfficial ? officialValue! : null,
      measured_value: hasMeasured ? measuredValue! : null,
      unit,
      difference_value: null,
      coverage_pct: null,
      result_status: 'insufficient_evidence',
      limitations:
        'Either the approved specification or the independent measurement is missing for this metric. Additional field documentation is required.',
      source_summary: `${metricName}: Official=${hasOfficial ? officialValue : 'N/A'} ${unit} vs Survey (${method}, ${surveyDate})=${hasMeasured ? measuredValue : 'N/A'} ${unit}`,
    };
  }

  const diff = Number((measuredValue! - officialValue!).toFixed(2));
  const coveragePct = Number(((measuredValue! / officialValue!) * 100).toFixed(2));

  let status: ComparisonStatus;
  if (coveragePct >= 95 && coveragePct <= 105) {
    status = 'consistent';
  } else if (coveragePct < 85 || coveragePct > 115) {
    status = 'possible_discrepancy';
  } else {
    status = 'requires_inspection';
  }

  return {
    metric_name: metricName,
    official_value: officialValue!,
    measured_value: measuredValue!,
    unit,
    difference_value: diff,
    coverage_pct: coveragePct,
    result_status: status,
    limitations:
      'Field measurements reflect conditions observed on the survey date and method tolerance. Differences may arise from phased execution, utility shifting, or measurement variance and require human officer verification—never a proof of misconduct.',
    source_summary: `${metricName}: Official ${officialValue} ${unit} vs Independent ${method} (${surveyDate}) ${measuredValue} ${unit}`,
  };
}

export function computeProjectComparisons(
  specs: ApprovedSpecsInput,
  survey: SurveyInput
): ComputedComparison[] {
  const surveyDate = survey.survey_date || new Date().toISOString().slice(0, 10);
  const method = survey.method || 'field_survey';

  const metrics: Array<ComputedComparison | null> = [
    evaluateMetric('Road / Asset Length', specs.length_m, survey.measured_length_m, 'metres', surveyDate, method),
    evaluateMetric('Carriageway / Corridor Width', specs.width_m, survey.measured_width_m, 'metres', surveyDate, method),
    evaluateMetric('Completed Surface Area', specs.area_sqm, survey.measured_area_sqm, 'sq. metres', surveyDate, method),
    evaluateMetric('Layer / Pavement Thickness', specs.thickness_mm, survey.measured_thickness_mm, 'mm', surveyDate, method),
  ];

  const valid = metrics.filter((item): item is ComputedComparison => item !== null);
  if (valid.length === 0) {
    return [
      {
        metric_name: 'General Physical Progress',
        official_value: null,
        measured_value: null,
        unit: 'metric',
        difference_value: null,
        coverage_pct: null,
        result_status: 'insufficient_evidence',
        limitations: 'No comparable numeric specification and measurement pairs were available.',
        source_summary: `Survey (${method}, ${surveyDate}) recorded without comparable numeric spec.`,
      },
    ];
  }

  return valid;
}
