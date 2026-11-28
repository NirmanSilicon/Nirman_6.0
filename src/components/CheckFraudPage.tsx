import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { SAMPLE_CASES, type TranslationContent } from '../i18n/translations.ts';
import type { ChannelType, FraudCheckResult, Language } from '../types/fraud.ts';
import { LanguageBar } from './LanguageBar.tsx';
import { SolutionVideoCard } from './SolutionVideoCard.tsx';

interface CheckFraudPageProps {
  t: TranslationContent;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  initialChannel?: ChannelType;
}

const CHANNELS: ChannelType[] = ['auto', 'sms', 'upi', 'link'];

export function CheckFraudPage({
  t,
  language,
  onChangeLanguage,
  initialChannel = 'auto',
}: CheckFraudPageProps) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>(initialChannel);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<FraudCheckResult | null>(null);
  const [history, setHistory] = useState<FraudCheckResult[]>([]);
  const [copied, setCopied] = useState(false);

  async function runFraudCheck(overrideText?: string, overrideChannel?: ChannelType) {
    const textToVerify = (overrideText ?? inputText).trim();
    const channelToUse = overrideChannel ?? selectedChannel;

    if (textToVerify.length < 3) {
      setErrorMsg(
        language === 'hi'
          ? 'कृपया कम से कम 3 अक्षरों का SMS, UPI आईडी या लिंक दर्ज करें।'
          : language === 'or'
            ? 'ଦୟାକରି ଅତି କମରେ 3 ଅକ୍ଷରର SMS, UPI ଆଇଡି କିମ୍ବା ଲିଙ୍କ୍ ଦିଅନ୍ତୁ।'
            : 'Please paste an SMS message, UPI ID, or link (at least 3 characters).'
      );
      return;
    }

    if (textToVerify.length > 5000) {
      setErrorMsg(
        language === 'hi'
          ? 'इनपुट बहुत लंबा है। कृपया सामग्री को 5000 अक्षरों तक सीमित रखें।'
          : language === 'or'
            ? 'ଇନପୁଟ୍ ବହୁତ ଲମ୍ବା ଅଟେ। ଦୟାକରି ବିଷୟବସ୍ତୁକୁ 5000 ଅକ୍ଷର ମଧ୍ୟରେ ରଖନ୍ତୁ।'
            : 'Input is too long. Please limit content to 5000 characters.'
      );
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setCopied(false);

    try {
      const response = await fetch('/api/check-fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: textToVerify,
          channel: channelToUse,
          language,
        }),
      });

      const rawBody = await response.text();
      let data: Partial<FraudCheckResult> & { error?: string } = {};
      try {
        data = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        throw new Error(
          response.ok
            ? 'Received an unexpected response format from the verification service.'
            : `Verification request failed (HTTP ${response.status}). Please try again.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || `Verification failed (HTTP ${response.status}).`);
      }

      const checked = data as FraudCheckResult;
      setResult(checked);
      setHistory((prev) => [checked, ...prev.slice(0, 7)]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete verification.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectSample(value: string, channel: Exclude<ChannelType, 'auto'>) {
    setInputText(value);
    setSelectedChannel(channel);
    setErrorMsg(null);
    void runFraudCheck(value, channel);
  }

  function handleClear() {
    setInputText('');
    setResult(null);
    setErrorMsg(null);
    setCopied(false);
  }

  async function handleCopyReport() {
    if (!result) return;
    const report = [
      `SATARK SETU Verdict: ${result.verdict}`,
      `Risk Score: ${result.riskScore}/100`,
      `Channel: ${result.detectedChannel}`,
      `Summary: ${result.summary}`,
      `Recommended Action: ${result.recommendedAction}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const isFraud = result?.verdict === 'FRAUD';
  const scoreColorClass =
    result && result.riskScore >= 65
      ? 'bg-[#DC2626]'
      : result && result.riskScore >= 36
        ? 'bg-[#D97706]'
        : 'bg-[#16A34A]';

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-16">
      {/* Page Header & Language Switcher */}
      <div className="mb-8 pb-6 border-b border-slate-200/80 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F2547] mb-2">
            {t.checker.title}
          </h1>
          <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
            {t.checker.subtitle}
          </p>
        </div>

        <LanguageBar
          language={language}
          onChangeLanguage={onChangeLanguage}
          label={t.languageLabel}
        />
      </div>

      {/* Main Two-Column Verification Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input + Quick Samples */}
        <section className="lg:col-span-6 bg-[#F3F7FD] border border-[#D7E3F4] rounded-2xl p-5 sm:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runFraudCheck();
            }}
          >
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#0F2547] mb-2">
                {t.checker.channelLabel}
              </label>
              <div
                role="group"
                aria-label={t.checker.channelLabel}
                className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg"
              >
                {CHANNELS.map((ch) => {
                  const active = selectedChannel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedChannel(ch)}
                      aria-pressed={active}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] ${
                        active
                          ? 'bg-[#0F2547] text-white'
                          : 'text-slate-600 hover:text-[#0F2547] hover:bg-slate-100'
                      }`}
                    >
                      {t.checker.channels[ch]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="fraud-input-box"
                  className="text-sm font-semibold text-[#0F2547]"
                >
                  {t.checker.inputLabel}
                </label>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {inputText.length} / 5000 {t.checker.charCount}
                </span>
              </div>

              <textarea
                id="fraud-input-box"
                rows={6}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.checker.placeholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-[#0F2547] focus:outline-none focus:ring-2 focus:ring-[#0F2547]/15 leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F2547] rounded-lg hover:bg-[#1A3A6E] disabled:opacity-60 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>{t.checker.analyzingBtn}</span>
                  </>
                ) : (
                  <span>{t.checker.analyzeBtn}</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading && !inputText}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.checker.clearBtn}</span>
              </button>
            </div>
          </form>

          {/* Realistic Sample Cases */}
          <div className="mt-6 pt-5 border-t border-[#D7E3F4]">
            <p className="text-xs font-semibold text-slate-600 mb-3">
              {t.checker.samplesTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CASES.map((sample) => {
                const isSampleFraud = sample.expectedType === 'FRAUD';
                return (
                  <button
                    key={sample.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSelectSample(sample.value, sample.channel)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] ${
                      isSampleFraud
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2]'
                        : 'bg-[#ECFDF5] border-[#BBF7D0] text-[#166534] hover:bg-[#DCFCE7]'
                    }`}
                  >
                    {t.checker.samples[sample.labelKey]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Verdict Output + Solution Video */}
        <section aria-live="polite" className="lg:col-span-6 space-y-6">
          {errorMsg && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-base font-bold text-[#991B1B]">
                    {t.checker.errorTitle}
                  </h2>
                  <p className="text-sm text-[#7F1D1D] mt-1 leading-relaxed">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => void runFraudCheck()}
                    className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#B91C1C] rounded-lg hover:bg-[#991B1B] transition-colors cursor-pointer"
                  >
                    {t.checker.retryBtn}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="h-7 w-40 rounded bg-slate-200 animate-pulse" />
                <div className="h-8 w-20 rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
              <div className="space-y-2 pt-2">
                <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
                <div className="h-4 w-4/6 rounded bg-slate-100 animate-pulse" />
              </div>
              <p className="text-sm text-slate-600 pt-2">{t.checker.loadingText}</p>
            </div>
          ) : result ? (
            <article
              className={`rounded-2xl border p-6 sm:p-7 transition-colors duration-150 ${
                isFraud
                  ? 'bg-[#FEF2F2] border-[#FCA5A5]'
                  : 'bg-[#ECFDF5] border-[#86EFAC]'
              }`}
            >
              {/* Verdict Header + Risk Score */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-900/10">
                <div>
                  <div className="inline-flex items-center gap-2.5">
                    {isFraud ? (
                      <ShieldAlert className="w-7 h-7 text-[#B91C1C] shrink-0" aria-hidden="true" />
                    ) : (
                      <ShieldCheck className="w-7 h-7 text-[#15803D] shrink-0" aria-hidden="true" />
                    )}
                    <span
                      className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${
                        isFraud ? 'text-[#B91C1C]' : 'text-[#15803D]'
                      }`}
                    >
                      {isFraud ? t.checker.verdictFraud : t.checker.verdictSafe}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-1.5">
                    {t.checker.detectedChannelLabel}: {result.detectedChannel}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-slate-600">
                    {t.checker.riskScoreLabel}
                  </p>
                  <p
                    className={`font-mono text-3xl sm:text-4xl font-bold tabular-nums leading-none mt-1 ${
                      isFraud ? 'text-[#B91C1C]' : 'text-[#15803D]'
                    }`}
                  >
                    {result.riskScore}
                    <span className="text-base font-medium text-slate-500">/100</span>
                  </p>
                </div>
              </div>

              {/* Risk Meter Bar */}
              <div className="py-4">
                <div
                  className="h-2.5 w-full rounded-full bg-white/80 overflow-hidden border border-slate-900/10"
                  role="progressbar"
                  aria-valuenow={result.riskScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t.checker.riskScoreLabel}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${scoreColorClass}`}
                    style={{ width: `${Math.max(4, result.riskScore)}%` }}
                  />
                </div>
              </div>

              {/* Summary & Headline */}
              <div className="space-y-2 pb-5">
                <h2 className="font-display text-lg font-bold text-[#0F2547]">
                  {result.headline}
                </h2>
                <p className="text-sm sm:text-[15px] text-slate-800 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Key Findings */}
              {result.signals.length > 0 && (
                <div className="py-4 border-t border-slate-900/10">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2.5">
                    {t.checker.findingsTitle}
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-800">
                    {result.signals.map((sig, idx) => (
                      <li key={`${sig}-${idx}`} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums pt-0.5">
                          0{idx + 1}.
                        </span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Action + Emergency Note */}
              <div className="pt-4 border-t border-slate-900/10 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1">
                    {t.checker.actionTitle}
                  </h3>
                  <p className="text-sm font-medium text-[#0F2547] leading-relaxed">
                    {result.recommendedAction}
                  </p>
                </div>

                {isFraud && (
                  <p className="text-xs font-semibold text-[#991B1B] pt-2 border-t border-[#FCA5A5]/60 leading-relaxed">
                    {t.checker.emergencyBanner}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyReport()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0F2547] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#15803D]" aria-hidden="true" />
                        <span>{t.checker.copiedBtn}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.checker.copyBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div className="bg-[#FFF9F1] border border-[#F5E0C3] rounded-2xl p-6 sm:p-7">
              <h2 className="font-display text-xl font-bold text-[#0F2547] mb-2">
                {t.checker.emptyTitle}
              </h2>
              <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed mb-5">
                {t.checker.emptyDescription}
              </p>

              <div className="space-y-3 pt-4 border-t border-[#E8CFAF]">
                <div className="flex items-start gap-2.5 text-sm text-[#166534]">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.checker.emptyGuide[0]}</span>
                </div>
                <div className="flex items-start gap-2.5 text-sm text-[#991B1B]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.checker.emptyGuide[1]}</span>
                </div>
              </div>
            </div>
          )}

          <SolutionVideoCard t={t} />
        </section>
      </div>

      {/* Session Scan History Table */}
      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-[#0F2547] mb-4">
          {t.checker.historyTitle}
        </h2>

        {history.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-6 text-sm text-slate-500">
            {t.checker.historyEmpty}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-4">{t.checker.historyColumns.content}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t.checker.historyColumns.channel}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t.checker.historyColumns.verdict}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    {t.checker.historyColumns.score}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const rowFraud = item.verdict === 'FRAUD';
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setResult(item);
                        setInputText(item.input);
                      }}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 max-w-md truncate text-slate-800 font-medium">
                        {item.input}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        {item.detectedChannel}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold ${
                            rowFraud ? 'text-[#B91C1C]' : 'text-[#15803D]'
                          }`}
                        >
                          {rowFraud ? (
                            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                          ) : (
                            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                          )}
                          <span>{item.verdict}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-[#0F2547] whitespace-nowrap">
                        {item.riskScore}/100
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
