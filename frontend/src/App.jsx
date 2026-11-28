
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import {
  activatePlant,
  getFaults,
  getFeedbackSummary,
  getHealth,
  getPlants,
} from "./api/client";

import { NAV_ITEMS, Sidebar } from "./components/Sidebar";
import { SimulationStrip } from "./components/SimulationStrip";
import { TopHeader } from "./components/TopHeader";

import { useSimulation } from "./hooks/useSimulation";

import { AlarmAnalysisView } from "./views/AlarmAnalysisView";
import { AnomalyDetectionView } from "./views/AnomalyDetectionView";
import { DashboardView } from "./views/DashboardView";
import { DataUploadView } from "./views/DataUploadView";
import { FaultClassificationView } from "./views/FaultClassificationView";
import { RecommendationsView } from "./views/RecommendationsView";
import { ReportsView } from "./views/ReportsView";
import { RootCauseAnalysisView } from "./views/RootCauseAnalysisView";

const VIEWS_WITH_SIM_STRIP = new Set([
  "dashboard",
  "alarms",
  "anomaly",
]);

const DEFAULT_PLANTS_DATA = {
  active_plant_id: "tep",
  plants: [],
};

function normalizePlantsData(data) {
  return {
    active_plant_id:
      data?.active_plant_id || "tep",

    plants: Array.isArray(data?.plants)
      ? data.plants
      : [],
  };
}

function formatMetric(value, decimals = 1) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(decimals)
    : "N/A";
}

export default function App() {
  // --------------------------------------------------
  // 1. APPLICATION STATE
  // --------------------------------------------------

  const [activeView, setActiveView] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [health, setHealth] = useState(null);
  const [faults, setFaults] = useState([]);

  const [plantsData, setPlantsData] = useState(
    DEFAULT_PLANTS_DATA
  );

  const [feedbackSummary, setFeedbackSummary] = useState(null);

  const [bootError, setBootError] = useState(null);
  const [activatingPlant, setActivatingPlant] = useState(false);

  const [toast, setToast] = useState(null);

  // --------------------------------------------------
  // 2. NOTIFICATION SYSTEM
  // --------------------------------------------------

  const showToast = useCallback((nextToast) => {
    setToast(nextToast);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [toast]);

  // --------------------------------------------------
  // 3. ACTIVE PLANT
  // --------------------------------------------------

  const activePlantId =
    plantsData.active_plant_id ||
    health?.active_plant_id ||
    "tep";

  const activePlant = useMemo(() => {
    const plants = plantsData.plants;

    return (
      plants.find(
        (plant) => plant.plant_id === activePlantId
      ) ||
      plants[0] ||
      null
    );
  }, [activePlantId, plantsData.plants]);

  // --------------------------------------------------
  // 4. SIMULATION ENGINE
  // --------------------------------------------------

  const sim = useSimulation({
    activePlantId,
    onNotification: showToast,
  });

  // --------------------------------------------------
  // 5. LOAD OPERATOR FEEDBACK
  // --------------------------------------------------

  const loadFeedback = useCallback(async () => {
    try {
      const feedback = await getFeedbackSummary();

      setFeedbackSummary(feedback || null);
    } catch (error) {
      // Feedback summary is non-critical.
      console.warn(
        "Unable to refresh feedback summary:",
        error?.message
      );
    }
  }, []);

  // --------------------------------------------------
  // 6. INITIAL BACKEND CONNECTION
  // --------------------------------------------------

  const bootstrapBackend = useCallback(async () => {
    setBootError(null);

    try {
      const [
        healthRes,
        faultsRes,
        plantsRes,
        feedbackRes,
      ] = await Promise.all([
        getHealth(),
        getFaults(),
        getPlants(),
        getFeedbackSummary(),
      ]);

      setHealth(healthRes || null);

      setFaults(
        Array.isArray(faultsRes?.faults)
          ? faultsRes.faults
          : []
      );

      setPlantsData(
        normalizePlantsData(plantsRes)
      );

      setFeedbackSummary(feedbackRes || null);
    } catch (error) {
      setBootError(
        error?.message ||
          "Unable to reach AlarmSense API at /api/v1. Ensure FastAPI is running on port 8000."
      );
    }
  }, []);

  useEffect(() => {
    bootstrapBackend();
  }, [bootstrapBackend]);

  // --------------------------------------------------
  // 7. PLANT MODEL SWITCHING
  // --------------------------------------------------

  const handleSelectPlant = useCallback(
    async (plantId) => {
      if (
        !plantId ||
        plantId === activePlantId ||
        activatingPlant
      ) {
        return;
      }

      setActivatingPlant(true);

      try {
        const activationResponse =
          await activatePlant(plantId);

        if (!activationResponse) {
          throw new Error(
            "The backend returned an empty plant activation response."
          );
        }

        const [
          healthRes,
          plantsRes,
        ] = await Promise.all([
          getHealth(),
          getPlants(),
        ]);

        setHealth(healthRes || null);

        setPlantsData(
          normalizePlantsData(plantsRes)
        );

        sim.appendActivity({
          type: "plant",

          title: `Activated plant model '${
            activationResponse.plant_name || plantId
          }'`,

          detail:
            `${activationResponse.n_sensors ?? "N/A"} sensors • ` +
            `window ${activationResponse.window_size ?? "N/A"} steps`,

          severity: "NORMAL",
        });

        showToast({
          type: "success",

          message:
            `Switched active model to ${
              activationResponse.plant_name || plantId
            }.`,
        });
      } catch (error) {
        showToast({
          type: "error",

          message:
            error?.message ||
            `Failed to activate plant '${plantId}'.`,
        });
      } finally {
        setActivatingPlant(false);
      }
    },
    [
      activePlantId,
      activatingPlant,
      showToast,
      sim.appendActivity,
    ]
  );

  // --------------------------------------------------
  // 8. CUSTOM PLANT RETRAINING CALLBACK
  // --------------------------------------------------

  const handlePlantRetrained = useCallback(
    async (retrainRes) => {
      try {
        const [
          healthRes,
          plantsRes,
        ] = await Promise.all([
          getHealth(),
          getPlants(),
        ]);

        setHealth(healthRes || null);

        setPlantsData(
          normalizePlantsData(plantsRes)
        );

        const accuracy = Number(
          retrainRes?.sample_accuracy
        );

        const macroF1 = Number(
          retrainRes?.sample_macro_f1
        );

        const accuracyText = Number.isFinite(accuracy)
          ? `${(accuracy * 100).toFixed(1)}%`
          : "N/A";

        const f1Text = Number.isFinite(macroF1)
          ? macroF1.toFixed(3)
          : "N/A";

        sim.appendActivity({
          type: "retrain",

          title:
            `Trained custom plant '${
              retrainRes?.plant_name || "Unknown Plant"
            }'`,

          detail:
            `Acc ${accuracyText} • F1 ${f1Text} • ` +
            `${retrainRes?.n_sensors ?? "N/A"} sensors`,

          severity: "NORMAL",
        });

        showToast({
          type: "success",

          message:
            `Plant '${
              retrainRes?.plant_id || "custom"
            }' trained (${accuracyText} accuracy).`,
        });
      } catch (error) {
        showToast({
          type: "error",

          message:
            error?.message ||
            "Plant training completed, but refreshing backend information failed.",
        });
      }
    },
    [
      showToast,
      sim.appendActivity,
    ]
  );

  // --------------------------------------------------
  // 9. NAVIGATION
  // --------------------------------------------------

  const currentNav =
    NAV_ITEMS.find(
      (item) => item.id === activeView
    ) || NAV_ITEMS[0];

  const handleSelectView = useCallback((view) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  }, []);

  // --------------------------------------------------
  // 10. APPLICATION UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#0F172A] flex">

      {/* SIDEBAR */}

      <Sidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        health={health}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* MAIN APPLICATION */}

      <div className="flex-1 min-w-0 flex flex-col">

        {/* HEADER */}

        <TopHeader
          title={currentNav.headerTitle}
          plants={plantsData.plants}
          activePlantId={activePlantId}
          activatingPlant={activatingPlant}
          onSelectPlant={handleSelectPlant}
          onNavigateUpload={() => setActiveView("upload")}
          onNavigateAlarms={() => setActiveView("alarms")}
          confirmedAlarmCount={
            sim.result?.confirmed_alarm_count ?? 0
          }
          priorityAlarms={
            Array.isArray(sim.result?.priority_alarms)
              ? sim.result.priority_alarms
              : []
          }
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* PAGE CONTENT */}

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] w-full mx-auto">

          {/* BACKEND CONNECTION ERROR */}

          {bootError && (
            <div
              role="alert"
              className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-900"
            >

              <div className="flex items-center gap-2.5">

                <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />

                <span>{bootError}</span>

              </div>

              <button
                type="button"
                onClick={bootstrapBackend}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
              >

                <RefreshCw className="w-3.5 h-3.5" />

                Retry Connection

              </button>

            </div>
          )}

          {/* SIMULATION CONTROL STRIP */}

          {VIEWS_WITH_SIM_STRIP.has(activeView) && (
            <SimulationStrip
              faults={faults}
              faultId={sim.faultId}
              onFaultIdChange={sim.setFaultId}
              episodeIndex={sim.episodeIndex}
              onEpisodeIndexChange={sim.setEpisodeIndex}
              preFaultSteps={sim.preFaultSteps}
              onPreFaultStepsChange={sim.setPreFaultSteps}
              isPlaying={sim.isPlaying}
              loading={sim.loading}
              result={sim.result}
              error={sim.error}
              activePlantId={activePlantId}
              onActivateTep={() => handleSelectPlant("tep")}
              onRun={sim.runNow}
              onTogglePlay={sim.togglePlay}
              onStep={sim.stepForward}
              onReset={sim.resetSimulation}
            />
          )}

          {/* DASHBOARD */}

          {activeView === "dashboard" && (
            <DashboardView
              health={health}
              activePlant={activePlant}
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
              activityLog={sim.activityLog}
              feedbackSummary={feedbackSummary}
            />
          )}

          {/* DATA UPLOAD */}

          {activeView === "upload" && (
            <DataUploadView
              activePlant={activePlant}
              onPlantRetrained={handlePlantRetrained}
              onAnalysisComplete={(data, label) => {
                sim.setAnalysisResult(data, label);

                const rootCauseName =
                  data?.root_cause?.name ||
                  "Unknown Fault";

                const confidence = Number(
                  data?.root_cause?.confidence
                );

                const confidenceText =
                  Number.isFinite(confidence)
                    ? ` (${formatMetric(confidence * 100, 1)}%)`
                    : "";

                showToast({
                  type: "success",

                  message:
                    `Window diagnosed: ${rootCauseName}${confidenceText}.`,
                });
              }}
            />
          )}

          {/* ALARM ANALYSIS */}

          {activeView === "alarms" && (
            <AlarmAnalysisView
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {/* ANOMALY DETECTION */}

          {activeView === "anomaly" && (
            <AnomalyDetectionView
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {/* FAULT CLASSIFICATION */}

          {activeView === "classification" && (
            <FaultClassificationView
              result={sim.result}
              faults={faults}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {/* ROOT CAUSE ANALYSIS */}

          {activeView === "rca" && (
            <RootCauseAnalysisView
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {/* OPERATOR RECOMMENDATIONS */}

          {activeView === "recommendations" && (
            <RecommendationsView
              result={sim.result}
              faults={faults}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
              onFeedbackRecorded={() => {
                loadFeedback();

                showToast({
                  type: "success",
                  message:
                    "Operator feedback recorded to backend audit log.",
                });
              }}
            />
          )}

          {/* REPORTS */}

          {activeView === "reports" && (
            <ReportsView
              activePlant={activePlant}
              health={health}
              result={sim.result}
              feedbackSummary={feedbackSummary}
              onRefreshFeedback={loadFeedback}
            />
          )}

        </main>

      </div>

      {/* TOAST NOTIFICATION */}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-xs sm:text-sm font-medium ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-white border-slate-200 text-[#0F172A]"
          }`}
        >

          {toast.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#00A8B5] shrink-0" />
          )}

          <span>{toast.message}</span>

        </div>
      )}

    </div>
  );
}
