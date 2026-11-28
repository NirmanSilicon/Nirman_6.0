
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { submitFeedback } from "../api/client";
import { EmptyStatePrompt } from "../components/EmptyStatePrompt";
import {
  formatPct,
  getSeverityBadgeClass,
} from "../utils/formatters";

/**
 * View 7 — Recommendations.
 *
 * Features:
 * 1. Root cause engineering summary
 * 2. Interactive recommended-action checklist
 * 3. Checklist completion progress
 * 4. Confirm / Reject diagnosis
 * 5. Corrected fault selection
 * 6. Operator feedback submission
 */

export function RecommendationsView({
  result,
  faults = [],
  loading = false,
  onRunSimulation,
  onFeedbackRecorded,
}) {
  // --------------------------------------------------
  // 1. STATE
  // --------------------------------------------------

  const [checkedSteps, setCheckedSteps] = useState({});
  const [action, setAction] = useState("confirm");

  const [correctedFaultId, setCorrectedFaultId] = useState("");

  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // --------------------------------------------------
  // 2. SAFE DATA
  // --------------------------------------------------

  const rootCause = result?.root_cause || {};

  const safeFaults = Array.isArray(faults)
    ? faults.filter(
        (fault) =>
          fault !== null &&
          typeof fault === "object"
      )
    : [];

  const actions = useMemo(() => {
    return Array.isArray(result?.recommended_actions)
      ? result.recommended_actions.filter(
          (step) =>
            typeof step === "string" ||
            typeof step === "number"
        )
      : [];
  }, [result?.recommended_actions]);

  const faultId = rootCause.fault_id;

  // --------------------------------------------------
  // 3. RESET STATE WHEN DIAGNOSIS CHANGES
  // --------------------------------------------------

  useEffect(() => {
    setCheckedSteps({});
    setSubmitSuccess(null);
    setSubmitError(null);
    setNotes("");
    setAction("confirm");

    if (faultId !== undefined && faultId !== null) {
      setCorrectedFaultId(String(faultId));
    } else {
      setCorrectedFaultId("");
    }
  }, [
    faultId,
    result?.episode_id,
    result?.step_index,
  ]);

  // --------------------------------------------------
  // 4. CHECKLIST PROGRESS
  // --------------------------------------------------

  const completedCount = actions.filter(
    (_, index) => Boolean(checkedSteps[index])
  ).length;

  const completionPercentage =
    actions.length > 0
      ? Math.round((completedCount / actions.length) * 100)
      : 0;

  const toggleAction = (index) => {
    setCheckedSteps((previous) => ({
      ...previous,
      [index]: !previous[index],
    }));
  };

  // --------------------------------------------------
  // 5. VALIDATE CORRECTED FAULT
  // --------------------------------------------------

  const correctedFaultExists = safeFaults.some(
    (fault) =>
      String(fault.fault_id) === String(correctedFaultId)
  );

  // --------------------------------------------------
  // 6. SUBMIT OPERATOR FEEDBACK
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);

    if (faultId === undefined || faultId === null) {
      setSubmitError(
        "Cannot submit feedback because the diagnosed fault ID is missing."
      );
      return;
    }

    if (action === "reject") {
      if (!correctedFaultId) {
        setSubmitError(
          "Please select the actual root cause fault."
        );
        return;
      }

      if (!correctedFaultExists) {
        setSubmitError(
          "The selected corrected fault is not available in the fault catalog."
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await submitFeedback({
        fault_id: faultId,

        episode_id: result?.episode_id ?? null,

        step_index: result?.step_index ?? null,

        action,

        corrected_fault_id:
          action === "reject"
            ? Number(correctedFaultId)
            : null,

        notes: notes.trim() || null,
      });

      const totalCount = Number(
        response?.total_feedback_count
      );

      const confirmedCount = Number(
        response?.confirmed_count
      );

      const rejectedCount = Number(
        response?.rejected_count
      );

      const hasCounts =
        Number.isFinite(totalCount) &&
        Number.isFinite(confirmedCount) &&
        Number.isFinite(rejectedCount);

      setSubmitSuccess(
        hasCounts
          ? `Feedback logged (${totalCount} total • ${confirmedCount} confirmed, ${rejectedCount} rejected).`
          : "Operator feedback successfully submitted."
      );

      setNotes("");

      if (typeof onFeedbackRecorded === "function") {
        onFeedbackRecorded(response);
      }
    } catch (error) {
      setSubmitError(
        error?.message ||
          "Failed to log feedback. Check that the selected fault is supported by the backend."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // 7. EMPTY STATE
  // --------------------------------------------------

  if (!result || !result.root_cause) {
    return (
      <EmptyStatePrompt
        title="No Operator Recommendations Yet"
        description="Run a simulation or custom window analysis to load the equipment playbook checklist and log operator feedback."
        onRun={onRunSimulation}
        loading={loading}
      />
    );
  }

  // --------------------------------------------------
  // 8. RENDER
  // --------------------------------------------------

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

      {/* ==============================================
          LEFT — PLAYBOOK & ACTION CHECKLIST
      ============================================== */}

      <section className="xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">

        {/* DIAGNOSIS HEADER */}

        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">

          <div className="flex items-start gap-3">

            <div className="w-10 h-10 rounded-xl bg-[#00A8B5]/12 text-[#00A8B5] flex items-center justify-center shrink-0">
              <ClipboardCheck
                className="w-5 h-5"
                aria-hidden="true"
              />
            </div>

            <div>

              <h2 className="text-base font-bold text-[#0F172A]">
                Fault {rootCause.fault_id ?? "—"} —{" "}
                {rootCause.name || "Unknown Fault"}
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Unit:{" "}
                {rootCause.equipment_unit ||
                  rootCause.unit ||
                  "Not specified"}{" "}
                • Confidence:{" "}
                <strong className="text-[#0F172A]">
                  {formatPct(rootCause.confidence, true)}
                </strong>
              </p>

            </div>

          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getSeverityBadgeClass(
              rootCause.severity_level
            )}`}
          >
            {rootCause.severity_level || "UNKNOWN"}
          </span>

        </div>

        {/* ENGINEERING SUMMARY */}

        <div className="rounded-xl bg-[#F4F8FB] border border-slate-200/80 p-4">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Engineering Summary
          </p>

          <p className="text-sm text-[#0F172A] leading-relaxed">
            {rootCause.summary ||
              "No engineering summary is available for this diagnosis."}
          </p>

        </div>

        {/* ACTION CHECKLIST */}

        <div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">

            <h3 className="text-sm font-bold text-[#0F172A]">
              Standard Operating Response Checklist
            </h3>

            <span className="text-xs font-semibold text-[#008B96] tabular-nums">
              {completedCount}/{actions.length} completed
            </span>

          </div>

          {/* PROGRESS BAR */}

          {actions.length > 0 && (
            <div className="mb-4">

              <div
                className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-label="Checklist completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completionPercentage}
              >
                <div
                  className="h-full bg-[#00A8B5] rounded-full transition-all duration-300"
                  style={{
                    width: `${completionPercentage}%`,
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-1 text-right">
                {completionPercentage}% completed
              </p>

            </div>
          )}

          {actions.length === 0 ? (

            <div className="rounded-xl border border-dashed border-slate-200 bg-[#F4F8FB]/60 p-6 text-center">

              <ClipboardCheck className="w-7 h-7 text-slate-300 mx-auto mb-2" />

              <p className="text-sm font-semibold text-slate-600">
                No recommended actions available
              </p>

              <p className="text-xs text-slate-400 mt-1">
                The backend did not return an operator checklist for this fault.
              </p>

            </div>

          ) : (

            <ol className="space-y-2.5">

              {actions.map((stepText, index) => {
                const done = Boolean(checkedSteps[index]);

                return (

                  <li key={`action-${index}`}>

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
                        onChange={() => toggleAction(index)}
                        className="mt-0.5 w-4 h-4 rounded accent-[#00A8B5] shrink-0"
                      />

                      <span className="font-mono text-xs font-bold text-[#008B96] mt-0.5 shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span
                        className={`text-sm leading-snug ${
                          done ? "line-through" : ""
                        }`}
                      >
                        {stepText}
                      </span>

                    </label>

                  </li>

                );
              })}

            </ol>

          )}

        </div>

      </section>

      {/* ==============================================
          RIGHT — OPERATOR FEEDBACK
      ============================================== */}

      <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 h-fit">

        <h3 className="text-base font-bold text-[#0F172A]">
          Operator Verification
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Confirm or correct this diagnosis to build the continuous improvement audit log.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >

          {/* CONFIRM / REJECT */}

          <div className="grid grid-cols-2 gap-3">

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setAction("confirm");
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              aria-pressed={action === "confirm"}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
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
              disabled={submitting}
              onClick={() => {
                setAction("reject");
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              aria-pressed={action === "reject"}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-60 ${
                action === "reject"
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-[#F4F8FB] border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              Reject & Correct
            </button>

          </div>

          {/* CORRECTED FAULT SELECTOR */}

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
                onChange={(event) =>
                  setCorrectedFaultId(event.target.value)
                }
                disabled={submitting}
                required
                className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
              >

                <option value="" disabled>
                  Select the actual fault
                </option>

                {safeFaults.map((fault, index) => (
                  <option
                    key={fault.fault_id ?? `fault-${index}`}
                    value={String(fault.fault_id)}
                  >
                    Fault {fault.fault_id} —{" "}
                    {fault.name || "Unknown Fault"}
                  </option>
                ))}

              </select>

              {safeFaults.length === 0 && (
                <p className="text-[11px] text-rose-600 mt-1">
                  No supported faults are available in the catalog.
                </p>
              )}

            </div>

          )}

          {/* ENGINEER NOTES */}

          <div>

            <label
              htmlFor="feedback-notes"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Shift Engineer Notes (optional)
            </label>

            <textarea
              id="feedback-notes"
              rows={4}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g., Confirmed Stream 1 valve closure via field gauge; operator bypass engaged."
              disabled={submitting}
              className="w-full bg-[#F4F8FB] border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00A8B5] disabled:opacity-60"
            />

            <p className="text-[10px] text-slate-400 text-right mt-1">
              {notes.length}/500 characters
            </p>

          </div>

          {/* ERROR */}

          {submitError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700"
            >
              {submitError}
            </div>
          )}

          {/* SUCCESS */}

          {submitSuccess && (
            <div
              role="status"
              className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              submitting ||
              (action === "reject" &&
                (!correctedFaultId || !correctedFaultExists))
            }
            className="w-full py-2.5 px-4 rounded-xl bg-[#00A8B5] hover:bg-[#008B96] text-white text-sm font-semibold shadow-xs disabled:opacity-60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A8B5] focus-visible:ring-offset-2"
          >
            {submitting
              ? "Submitting..."
              : "Submit Operator Feedback"}
          </button>

        </form>

      </section>

    </div>
  );
}
