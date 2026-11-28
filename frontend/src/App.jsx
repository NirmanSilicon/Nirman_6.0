import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
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

const VIEWS_WITH_SIM_STRIP = new Set(["dashboard", "alarms", "anomaly"]);

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [health, setHealth] = useState(null);
  const [faults, setFaults] = useState([]);
  const [plantsData, setPlantsData] = useState({ active_plant_id: "tep", plants: [] });
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [activatingPlant, setActivatingPlant] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((nextToast) => {
    setToast(nextToast);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const activePlantId = plantsData.active_plant_id || health?.active_plant_id || "tep";

  const activePlant = useMemo(
    () =>
      plantsData.plants.find((p) => p.plant_id === activePlantId) ||
      plantsData.plants[0] ||
      null,
    [activePlantId, plantsData.plants],
  );

  const sim = useSimulation({
    activePlantId,
    onNotification: showToast,
  });

  const loadFeedback = useCallback(async () => {
    try {
      const fb = await getFeedbackSummary();
      setFeedbackSummary(fb);
    } catch {
      // Non-fatal if backend is temporarily unavailable
    }
  }, []);

  const bootstrapBackend = useCallback(async () => {
    setBootError(null);
    try {
      const [healthRes, faultsRes, plantsRes, fbRes] = await Promise.all([
        getHealth(),
        getFaults(),
        getPlants(),
        getFeedbackSummary(),
      ]);
      setHealth(healthRes);
      setFaults(faultsRes?.faults || []);
      setPlantsData(plantsRes || { active_plant_id: "tep", plants: [] });
      setFeedbackSummary(fbRes);
    } catch (err) {
      setBootError(
        err?.message ||
          "Unable to reach AlarmSense API at /api/v1. Ensure FastAPI is running on port 8000.",
      );
    }
  }, []);

  useEffect(() => {
    bootstrapBackend();
  }, [bootstrapBackend]);

  const handleSelectPlant = useCallback(
    async (plantId) => {
      if (!plantId || plantId === activePlantId) return;
      setActivatingPlant(true);
      try {
        const res = await activatePlant(plantId);
        const [healthRes, plantsRes] = await Promise.all([getHealth(), getPlants()]);
        setHealth(healthRes);
        setPlantsData(plantsRes);
        sim.appendActivity({
          type: "plant",
          title: `Activated plant model '${res.plant_name}'`,
          detail: `${res.n_sensors} sensors • window ${res.window_size} steps`,
          severity: "NORMAL",
        });
        showToast({
          type: "success",
          message: `Switched active model to ${res.plant_name}.`,
        });
      } catch (err) {
        showToast({
          type: "error",
          message: err?.message || `Failed to activate plant '${plantId}'.`,
        });
      } finally {
        setActivatingPlant(false);
      }
    },
    [activePlantId, showToast, sim],
  );

  const handlePlantRetrained = useCallback(
    async (retrainRes) => {
      const [healthRes, plantsRes] = await Promise.all([getHealth(), getPlants()]);
      setHealth(healthRes);
      setPlantsData(plantsRes);
      sim.appendActivity({
        type: "retrain",
        title: `Trained custom plant '${retrainRes.plant_name}'`,
        detail: `Acc ${(retrainRes.sample_accuracy * 100).toFixed(1)}% • F1 ${retrainRes.sample_macro_f1.toFixed(3)} • ${retrainRes.n_sensors} sensors`,
        severity: "NORMAL",
      });
      showToast({
        type: "success",
        message: `Plant '${retrainRes.plant_id}' trained (${(retrainRes.sample_accuracy * 100).toFixed(1)}% accuracy).`,
      });
    },
    [showToast, sim],
  );

  const currentNav = NAV_ITEMS.find((item) => item.id === activeView) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#0F172A] flex">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        health={health}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopHeader
          title={currentNav.headerTitle}
          plants={plantsData.plants}
          activePlantId={activePlantId}
          activatingPlant={activatingPlant}
          onSelectPlant={handleSelectPlant}
          onNavigateUpload={() => setActiveView("upload")}
          onNavigateAlarms={() => setActiveView("alarms")}
          confirmedAlarmCount={sim.result?.confirmed_alarm_count ?? 0}
          priorityAlarms={sim.result?.priority_alarms || []}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] w-full mx-auto">
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

          {activeView === "upload" && (
            <DataUploadView
              activePlant={activePlant}
              onPlantRetrained={handlePlantRetrained}
              onAnalysisComplete={(data, label) => {
                sim.setAnalysisResult(data, label);
                showToast({
                  type: "success",
                  message: `Window diagnosed: ${data.root_cause.name} (${(data.root_cause.confidence * 100).toFixed(1)}%).`,
                });
              }}
            />
          )}

          {activeView === "alarms" && (
            <AlarmAnalysisView
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {activeView === "anomaly" && (
            <AnomalyDetectionView
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {activeView === "classification" && (
            <FaultClassificationView
              result={sim.result}
              faults={faults}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {activeView === "rca" && (
            <RootCauseAnalysisView
              result={sim.result}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
            />
          )}

          {activeView === "recommendations" && (
            <RecommendationsView
              result={sim.result}
              faults={faults}
              activePlant={activePlant}
              loading={sim.loading}
              onRunSimulation={sim.runNow}
              onFeedbackRecorded={() => {
                loadFeedback();
                showToast({
                  type: "success",
                  message: "Operator feedback recorded to backend audit log.",
                });
              }}
            />
          )}

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

      {/* Transient Toast Banner */}
      {toast && (
        <div
          role="status"
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
