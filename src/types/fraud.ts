export type Language = 'en' | 'hi' | 'or';

export type PageId = 'home' | 'check';

export type ChannelType = 'auto' | 'sms' | 'upi' | 'link';

export type VerdictType = 'SAFE' | 'FRAUD';

export interface FraudCheckResult {
  id: string;
  input: string;
  verdict: VerdictType;
  riskScore: number;
  detectedChannel: 'SMS' | 'UPI' | 'LINK';
  headline: string;
  summary: string;
  signals: string[];
  recommendedAction: string;
  checkedAt: string;
  language: Language;
}

export interface SampleCase {
  id: string;
  channel: Exclude<ChannelType, 'auto'>;
  expectedType: VerdictType;
  labelKey: string;
  value: string;
}
