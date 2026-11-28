import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { submitFeedback } from "../api/client";
import { EmptyStatePrompt } from "../components/EmptyStatePrompt";
import { formatPct, getSeverityBadgeClass } from "../utils/formatters";

/**
 * View 7 — Recommendations.
 * Displays root_cause.summary, interactive numbered recommended_actions checklist,
 * and Confirm / Reject & Correct feedback form wired to POST /api/v1/feedback.
 */
export function RecommendationsView({
  result,
  faults,
  loading,
  onRunSimulation,
  onFeedbackRecorded,
}) {
  const [checkedSteps, setCheckedSteps] = useState({});
  const [action, setAction] = useState("confirm");
  const [correctedFaultId, setCorrectedFaultId] = useState(6);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  useEffect(() => {
    setCheckedSteps({});
    setSubmitSuccess(null);
    setSubmitError(null);
    if (result?.root_cause?.fault_id !== undefined) {
      setCorrectedFaultId(result.root_cause.fault_id);
    }
  }, [result?.root_cause?.fault_id, result?.episode_id, result?.step_index]);

  if (!result) {
    return (
      <EmptyStatePrompt
        title="No Operator Recommendations Yet"
        description="Run a simulation or custom window analysis to load the equipment playbook checklist and log operator feedback."
        onRun={onRunSimulation}
        loading={loading}
      />
    );
  }

  const actions = result.recommended_actions || [];
  const toggleAction = (idx) => {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await submitFeedback({
        fault_id: result.root_cause.fault_id,
        episode_id: result.episode_id ?? null,
        step_index: result.step_index ?? null,
        action,
        corrected_fault_id: action === "reject" ? Number(correctedFaultId) : null,
        notes: notes.trim() || null,
      });
      setSubmitSuccess(
        `Feedback logged (${response.total_feedback_count} total • ${response.confirmed_count} confirmed, ${response.rejected_count} rejected).`,
      );
      setNotes("");
      onFeedbackRecorded?.(response);
    } catch (err) {
      setSubmitError(
        err?.message ||
          "Failed to log feedback. Note: backend feedback requires a supported TEP fault_id.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* Left: Playbook & Action Checklist */}
      <section className="xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Fault {result.root_cause.fault_id} — {result.root_cause.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Unit: {result.root_cause.equipment_unit} • Confidence:{" "}
                <strong className="text-[#0F172A]">
                  {formatPct(result.root_cause.confidence, true)}
                </strong>
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getSeverityBadgeClass(
              result.root_cause.severity_level,
            )}`}
          >
            {result.root_cause.severity_level}
          </span>
        </div>

        <div className="rounded-xl bg-[#F4F8FB] border border-slate-200/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Engineering Summary
          </p>
          <p className="text-sm text-[#0F172A] leading-relaxed">
            {result.root_cause.summary}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#0F172A] mb-3">
            Standard Operating Response Checklist
          </h3>
          <ol className="space-y-2.5">
            {actions.map((stepText, idx) => {
              const done = Boolean(checkedSteps[idx]);
              return (
                <li key={idx}>
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                      done
                        ? "bg-emerald-50/70 border-emerald-200 text-slate-500"
                        : "bg-white border-slate-200 hover:border-[#00A8B5]/60 text-[#0F172A]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleAction(idx)}
                      className="mt-0.5 w-4 h-4 rounded accent-[#00A8B5] shrink-0"
                    />
                    <span className="font-mono text-xs font-bold text-[#008B96] mt-0.5 shrink-0">
                      0{idx + 1}
                    </span>
                    <span className={`text-sm leading-snug ${done ? "line-through" : ""}`}>
                      {stepText}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Right: Operator Feedback Form */}
      <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 h-fit">
        <h3 className="text-base font-bold text-[#0F172A]">Operator Verification</h3>
        <p className="text-xs text-slate-500 mt-1">
          Confirm or correct this diagnosis to build the continuous improvement audit log.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction("confirm")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                action === "confirm"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-[#F4F8FB] border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Confirm Diagnosis
            </button>
            <button
              type="button"
              onClick={() => setAction("reject")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                action === "reject"
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-[#F4F8FB] border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              Reject & Correct
            </button>
          </div>

          {action === "reject" && (
            <div>
              <label
                htmlFor="feedback-corrected-fault"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Actual Root Cause Fault
              </label>
              <select
                id="feedback-corrected-fault"
                value={correctedFaultId}
                onChange={(e) => setCorrectedFaultId(Number(e.target.value))}
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
              >
                {(faults || []).map((f) => (
                  <option key={f.fault_id} value={f.fault_id}>
                    Fault {f.fault_id} — {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="feedback-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Shift Engineer Notes (optional)
            </label>
            <textarea
              id="feedback-notes"
              rows={4}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Confirmed Stream 1 valve closure via field gauge; operator bypass engaged."
              className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5]"
            />
          </div>

          {submitError && (
            <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >
            {submitting ? "Submitting..." : "Submit Operator Feedback"}
          </button>
        </form>
      </section>
    </div>
  );
}
