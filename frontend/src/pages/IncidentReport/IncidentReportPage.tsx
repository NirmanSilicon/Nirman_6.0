import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  Layers, 
  Cpu, 
  Activity, 
  Share2, 
  Copy, 
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRight,
  Sliders,
  Flame,
  BatteryCharging,
  Zap,
  Radio,
  FileCheck,
  Award,
  Terminal,
  CornerDownRight
} from 'lucide-react';
import { RotatingMoonBackground } from '../../components/RotatingMoonBackground';
import { useAnalysis } from '../../context/AnalysisContext';
import { backendApi } from '../../services/backendApi';

interface IncidentReportPageProps {
  onBack: () => void;
  onOpenEvidenceTrace?: () => void;
  onOpenReconstruction?: () => void;
  onOpenCaelis?: () => void;
  theme?: 'light' | 'dark';
}

export const IncidentReportPage: React.FC<IncidentReportPageProps> = ({
  onBack,
  onOpenEvidenceTrace,
  onOpenReconstruction,
  onOpenCaelis,
  theme = 'light'
}) => {
  const { analysis, activeIncidentId } = useAnalysis();
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'genealogy' | 'telemetry' | 'recommendations' | 'export'>('summary');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'pdf'>('json');

  // Report Core Metadata (Reflecting active Canonical Analysis if available)
  const reportData = {
    title: "FAILURE MODE GENEALOGY INCIDENT REPORT",
    investigationId: analysis?.incident_id ? `GT-${analysis.incident_id.toUpperCase()}-FMEA` : "GT-8849-ORBIT-FMEA",
    classification: "CAS-CRITICAL INVESTIGATION FILE // ECSS-Q-ST-30-02C COMPLIANT",
    generatedAt: analysis?.created_at || "2026-03-14 03:38:00 UTC",
    mission: analysis?.mission_id || "CUBESAT-07",
    orbitProfile: "510 km Sun-Synchronous LEO (97.4° Inclination)",
    incidentWindow: "12:41:03 — 12:44:09",
    windowDuration: "3m 06s (186 seconds)",
    primaryCause: "THERMAL SENSOR T-17 ANOMALY",
    confidence: 0.94,
    propagation: "7 EVENTS",
    downstreamImpact: "5 COMPONENTS",
    evidenceCoverage: "91%",
    insufficientEvidence: "1 EVENT",
    earliestIntervention: "T−10 SECONDS",
    preventableFailures: "5 / 6",
    verdict: "CASCADE LOSS OF COMMS PREVENTABLE VIA SENSOR SANITY CLAMP",
    signOff: {
      leadInvestigator: "Flight Operations Causal Engineering Team",
      aiEngine: "Caelis Bayesian Temporal Reasoner v2.4",
      standard: "NASA-STD-8729.1A / ECSS-Q-ST-30-02C",
      validationHash: "SHA256: 9e3f1c8a4b7720cd09e51fa73e66a20d4188b"
    }
  };

  // Genealogy Propagation Chain
  const genealogyChain = [
    {
      step: "01",
      time: "12:41:03",
      offset: "T+000s",
      subsystem: "Thermal Sensor T-17",
      event: "Analog thermistor negative rail drift / code 0x0012",
      reading: "-240.2°C (Floor -45.0°C)",
      role: "PRIMARY ORIGIN",
      roleType: "primary",
      prevented: false,
      evidenceSupport: "Strong (0.98)",
      physicsProof: "Resistive voltage divider solder fracture during thermal eclipse transition."
    },
    {
      step: "02",
      time: "12:41:08",
      offset: "T+005s",
      subsystem: "Survival Heater Relay",
      event: "100% Continuous duty cycle lock engaged",
      reading: "28.4W continuous power draw",
      role: "PROPAGATION #1",
      roleType: "propagation",
      prevented: true,
      evidenceSupport: "Strong (0.96)",
      physicsProof: "Firmware trusted out-of-range sensor code without deadband clamp override."
    },
    {
      step: "03",
      time: "12:42:21",
      offset: "T+078s",
      subsystem: "Battery Module (Li-Ion)",
      event: "Thermal runaway protection & high-drain thermal degradation",
      reading: "Temp: +58.4°C / SoC: 88% → 14%",
      role: "PROPAGATION #2",
      roleType: "propagation",
      prevented: true,
      evidenceSupport: "Strong (0.94)",
      physicsProof: "Continuous 2.36A sustained draw exceeded passive thermal radiation capacity in shadow."
    },
    {
      step: "04",
      time: "12:43:40",
      offset: "T+157s",
      subsystem: "OBC Task Scheduler",
      event: "High-priority loop preemption & telemetry buffer queue overrun",
      reading: "Task buffer: 99.4% full / CPU: 98.2%",
      role: "PROPAGATION #3",
      roleType: "propagation",
      prevented: true,
      evidenceSupport: "Moderate (0.76)",
      physicsProof: "Watchdog queue starved by synchronous high-frequency I2C retry storms."
    },
    {
      step: "05",
      time: "12:44:03",
      offset: "T+180s",
      subsystem: "Regulated Power Bus",
      event: "Undervoltage lockout (UVLO) trip & rail collapse",
      reading: "Bus: 12.1V → 0.04V / 7.8A trip",
      role: "PROPAGATION #4",
      roleType: "propagation",
      prevented: true,
      evidenceSupport: "Strong (0.97)",
      physicsProof: "Battery cell voltage dipped below BMS hardware cutoff threshold (2.78V/cell)."
    },
    {
      step: "06",
      time: "12:44:07",
      offset: "T+184s",
      subsystem: "S-Band Transceiver",
      event: "RF Power Amp cutoff & RF beacon silence",
      reading: "Carrier: 0.00 mW (Carrier Drop)",
      role: "FINAL CONSEQUENCE",
      roleType: "consequence",
      prevented: true,
      evidenceSupport: "Strong (0.99)",
      physicsProof: "Immediate loss of +12V power supply to S-band solid-state power amplifier."
    },
    {
      step: "07",
      time: "12:44:09",
      offset: "T+186s",
      subsystem: "ADCS Star Tracker",
      event: "Optical sensor unpowered / loss of attitude hold",
      reading: "Attitude matrix unreferenced",
      role: "CONSEQUENCE",
      roleType: "consequence",
      prevented: true,
      evidenceSupport: "Insufficient (0.42)",
      physicsProof: "Secondary telemetry loss prevented attitude ground confirmation (Gap 1)."
    }
  ];

  // Raw JSON Payload for Export
  const jsonReportPayload = {
    schema_version: "2.4.0",
    standard: "ECSS-Q-ST-30-02C",
    report_type: "FAILURE_MODE_GENEALOGY_INCIDENT_REPORT",
    mission_id: reportData.mission,
    investigation_id: reportData.investigationId,
    timestamp_utc: reportData.generatedAt,
    incident_window: {
      start: "12:41:03 UTC",
      end: "12:44:09 UTC",
      duration_seconds: 186
    },
    primary_root_cause: {
      component: reportData.primaryCause,
      telemetry_signature: "Analog Thermistor Negative Rail Drift (0x0012)",
      causal_confidence: reportData.confidence,
      physical_mechanism: "Cold-side solder joint micro-fracture during thermal eclipse exit inducing open-circuit ADC saturation"
    },
    metrics: {
      propagation_events_count: 7,
      downstream_components_affected: 5,
      evidence_coverage_ratio: 0.91,
      insufficient_evidence_events: 1,
      earliest_effective_intervention: reportData.earliestIntervention,
      preventable_failures_fraction: "5/6"
    },
    genealogy_cascade: genealogyChain,
    counterfactual_verdict: {
      recommended_action: "Firmware deadband sanity limit clamping on analog thermistor channels",
      prevention_score: "83.3% total cascade suppression",
      mission_survival_probability: 0.965
    }
  };

  const handleExportJSON = async () => {
    let payload = jsonReportPayload;
    try {
      const serverReport = await backendApi.exportReport(activeIncidentId || 'inc_001', 'json');
      if (serverReport) {
        payload = { ...payload, ...serverReport };
      }
    } catch (err) {
      console.warn('[IncidentReport] Server export unavailable, utilizing localized validated dossier.', err);
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `INCIDENT_REPORT_${reportData.mission}_${reportData.investigationId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonReportPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative min-h-screen bg-[#F0EAD6] text-[#1A1A1A] font-sans selection:bg-[#DC143C] selection:text-[#FAF6EE] print:bg-white print:text-black overflow-x-hidden">
      
      {/* Background Big Rotating Moon */}
      <RotatingMoonBackground 
        speed={110} 
        opacityClass="opacity-95 sm:opacity-100 dark:opacity-100"
        className="print:hidden" 
      />

      {/* 1. TOP UTILITY ACTION BAR (Hidden in print) */}
      <div className="relative z-40 bg-[#F0EAD6]/80 border-b-2 border-[#1A1A1A]/20 sticky top-0 backdrop-blur-md px-4 sm:px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Breadcrumbs & Classification */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3.5 py-1.5 border border-[#1A1A1A]/30 text-xs sm:text-sm font-mono-tech font-bold uppercase bg-[#F0EAD6]/80 text-[#1A1A1A] hover:bg-[#E2D5C0] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>← RETURN</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm font-mono-tech text-[#1A1A1A]/80">
              <span className="font-bold text-[#DC143C]">08</span>
              <span>/</span>
              <span className="font-bold uppercase tracking-wider">INCIDENT REPORT</span>
              <span>·</span>
              <span className="bg-[#DC143C]/10 text-[#DC143C] px-2.5 py-0.5 font-bold border border-[#DC143C]/30 text-xs">
                OFFICIAL FLIGHT DOSSIER
              </span>
            </div>
          </div>

          {/* Right: Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#F0EAD6]/85 text-[#1A1A1A] text-xs sm:text-sm font-mono-tech font-bold hover:bg-[#1A1A1A] hover:text-[#FAF6EE] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>[ EXPORT JSON ]</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="px-4 py-2 border-2 border-[#DC143C] bg-[#DC143C] text-[#FAF6EE] text-xs sm:text-sm font-mono-tech font-bold hover:bg-[#C5A945] hover:border-[#C5A945] transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>[ GENERATE 1-PAGE PDF ]</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. MAIN REPORT CONTAINER (Rendered as an authentic 1-page engineering dossier) */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        
        {/* PHYSICAL DOCUMENT CANVAS (Calibrated parchment allowing the rotating moon silhouette to clearly show through) */}
        <div className="bg-[#FAF6EE]/58 backdrop-blur-[2px] border-4 border-[#1A1A1A] p-6 sm:p-10 shadow-2xl relative overflow-hidden print:bg-white print:border-2 print:shadow-none print:p-6">
          
          {/* Subtle Document Grid Texture */}
          <div className="absolute inset-0 bg-halftone opacity-5 pointer-events-none print:hidden"></div>
          
          {/* Corner Document Stamps */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-8 flex flex-col items-end pointer-events-none opacity-90">
            <div className="border-2 border-[#DC143C] text-[#DC143C] font-mono-tech font-black text-xs sm:text-sm px-3.5 py-1 uppercase tracking-widest rotate-[-2deg] bg-[#F0EAD6]/85 shadow-sm">
              FINAL INVESTIGATION RECORD
            </div>
            <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/70 mt-1 font-bold">
              REF: {reportData.investigationId}
            </span>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              HEADER: MISSION IDENTITY & TITLE
          ───────────────────────────────────────────────────────────── */}
          <div className="border-b-4 border-[#1A1A1A] pb-6 mb-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono-tech text-[#C5A945] font-bold tracking-widest uppercase mb-1">
              <ShieldAlert className="w-4 h-4 text-[#DC143C]" />
              <span>{reportData.classification}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-headline font-black tracking-tight text-[#1A1A1A] leading-none mb-3">
              FAILURE MODE GENEALOGY<br />
              <span className="text-[#DC143C]">INCIDENT REPORT</span>
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm font-mono-tech bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A]/30 mt-4 shadow-sm">
              <div>
                <span className="text-[#625A50] block text-[11px] sm:text-xs font-bold uppercase">MISSION</span>
                <strong className="text-[#1A1A1A] font-bold text-sm sm:text-base">{reportData.mission}</strong>
              </div>
              <div>
                <span className="text-[#625A50] block text-[11px] sm:text-xs font-bold uppercase">INCIDENT WINDOW</span>
                <strong className="text-[#1A1A1A] font-bold text-sm sm:text-base">{reportData.incidentWindow}</strong>
              </div>
              <div>
                <span className="text-[#625A50] block text-[11px] sm:text-xs font-bold uppercase">DURATION</span>
                <strong className="text-[#1A1A1A] font-bold text-sm sm:text-base">{reportData.windowDuration}</strong>
              </div>
              <div>
                <span className="text-[#625A50] block text-[11px] sm:text-xs font-bold uppercase">STANDARD COMPLIANCE</span>
                <strong className="text-[#1A1A1A] font-bold text-sm sm:text-base">ECSS / NASA-STD</strong>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              EXECUTIVE METRIC SCOREBOARD (EXACT SPECIFICATION VALUES)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            
            {/* Primary Cause */}
            <div className="bg-[#1A1A1A]/80 backdrop-blur-xs text-[#FAF6EE] p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#E5C76B] font-bold uppercase tracking-wider">
                PRIMARY CAUSE
              </span>
              <div className="text-sm sm:text-base font-headline font-black text-[#FAF6EE] my-1 leading-snug">
                {reportData.primaryCause}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#FAF6EE]/80 font-medium">
                Analog rail drift 0x0012
              </span>
            </div>

            {/* Confidence */}
            <div className="bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#625A50] font-bold uppercase tracking-wider">
                CONFIDENCE
              </span>
              <div className="text-3xl sm:text-4xl font-mono-tech font-black text-[#DC143C] my-0.5">
                {reportData.confidence}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">Bayesian Posterior</span>
            </div>

            {/* Earliest Intervention */}
            <div className="bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#625A50] font-bold uppercase tracking-wider">
                EARLIEST INTERVENTION
              </span>
              <div className="text-xl sm:text-2xl font-mono-tech font-black text-[#DC143C] my-0.5 whitespace-nowrap">
                {reportData.earliestIntervention}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">Deadband Sanity</span>
            </div>

            {/* Preventable Failures */}
            <div className="bg-[#E5C76B]/20 backdrop-blur-xs p-3.5 border-2 border-[#C5A945] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#C5A945] font-bold uppercase tracking-wider">
                PREVENTABLE FAILURES
              </span>
              <div className="text-2xl sm:text-3xl font-mono-tech font-black text-[#1A1A1A] my-0.5">
                {reportData.preventableFailures}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">83.3% Cascades</span>
            </div>

            {/* Propagation */}
            <div className="bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#625A50] font-bold uppercase tracking-wider">
                PROPAGATION
              </span>
              <div className="text-xl sm:text-2xl font-mono-tech font-black text-[#1A1A1A] my-0.5">
                {reportData.propagation}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">Forward Chain</span>
            </div>

            {/* Downstream Impact */}
            <div className="bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#625A50] font-bold uppercase tracking-wider">
                DOWNSTREAM IMPACT
              </span>
              <div className="text-xl sm:text-2xl font-mono-tech font-black text-[#1A1A1A] my-0.5">
                {reportData.downstreamImpact}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">Critical Subsystems</span>
            </div>

            {/* Evidence Coverage */}
            <div className="bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#625A50] font-bold uppercase tracking-wider">
                EVIDENCE COVERAGE
              </span>
              <div className="text-3xl sm:text-4xl font-mono-tech font-black text-[#1A1A1A] my-0.5">
                {reportData.evidenceCoverage}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">Packet Verified</span>
            </div>

            {/* Insufficient Evidence */}
            <div className="bg-[#FAF6EE]/40 backdrop-blur-xs p-3.5 border-2 border-[#1A1A1A] flex flex-col justify-between min-h-[118px] shadow-sm">
              <span className="text-xs font-mono-tech text-[#625A50] font-bold uppercase tracking-wider">
                INSUFFICIENT EVIDENCE
              </span>
              <div className="text-xl sm:text-2xl font-mono-tech font-black text-[#C5A945] my-0.5">
                {reportData.insufficientEvidence}
              </div>
              <span className="text-[11px] sm:text-xs font-mono-tech text-[#1A1A1A]/80 font-semibold">ADCS Loss In Gap</span>
            </div>

          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 1: CAUSAL FAILURE GENEALOGY SEQUENCE TABLE
          ───────────────────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#1A1A1A] mb-3">
              <h2 className="text-xl sm:text-2xl font-headline font-black text-[#1A1A1A] tracking-tight uppercase flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#DC143C]" />
                <span>1. Causal Failure Genealogy Sequence</span>
              </h2>
              <span className="text-xs sm:text-sm font-mono-tech text-[#625A50] font-bold">
                TEMPORAL FORWARD PROPAGATION (7 EVENTS)
              </span>
            </div>

            <div className="overflow-x-auto border-2 border-[#1A1A1A] bg-[#FAF6EE]/30 backdrop-blur-xs">
              <table className="w-full text-left text-xs sm:text-sm font-mono-tech border-collapse">
                <thead>
                  <tr className="bg-[#1A1A1A]/80 backdrop-blur-xs text-[#FAF6EE] border-b-2 border-[#1A1A1A]">
                    <th className="py-3 px-3.5 font-bold w-12 text-center text-xs sm:text-sm">#</th>
                    <th className="py-3 px-3.5 font-bold w-28 text-xs sm:text-sm">TIME</th>
                    <th className="py-3 px-3.5 font-bold w-48 text-xs sm:text-sm">SUBSYSTEM</th>
                    <th className="py-3 px-3.5 font-bold text-xs sm:text-sm">PHYSICAL EVENT & EVIDENCE READING</th>
                    <th className="py-3 px-3.5 font-bold w-40 text-xs sm:text-sm">ROLE / CONFIDENCE</th>
                    <th className="py-3 px-3.5 font-bold w-32 text-center text-xs sm:text-sm">PREVENTABLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]/20 bg-transparent">
                  {genealogyChain.map((ev, idx) => (
                    <tr 
                      key={ev.step}
                      className={
                        idx === 0 
                          ? 'bg-[#DC143C]/10 font-semibold' 
                          : idx % 2 === 1 
                            ? 'bg-[#FAF6EE]/25' 
                            : 'bg-transparent'
                      }
                    >
                      {/* Step */}
                      <td className="py-3 px-3.5 text-center font-bold text-[#1A1A1A] text-sm sm:text-base">
                        {ev.step}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-[#1A1A1A] text-sm sm:text-base">{ev.time}</span>
                        <span className="text-xs text-[#625A50] block font-semibold">{ev.offset}</span>
                      </td>

                      {/* Subsystem */}
                      <td className="py-3 px-3.5">
                        <strong className="text-[#1A1A1A] block font-bold text-sm sm:text-base">{ev.subsystem}</strong>
                        <span className="text-xs text-[#625A50] font-medium">{ev.physicsProof}</span>
                      </td>

                      {/* Event Description & Reading */}
                      <td className="py-3 px-3.5">
                        <div className="text-[#1A1A1A] font-semibold text-xs sm:text-sm leading-relaxed">{ev.event}</div>
                        <div className="text-xs text-[#DC143C] font-mono-tech font-bold mt-1">
                          TELEMETRY: {ev.reading}
                        </div>
                      </td>

                      {/* Role & Confidence */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs font-bold border uppercase tracking-wide ${
                          ev.roleType === 'primary' 
                            ? 'bg-[#DC143C] text-[#FAF6EE] border-[#DC143C]'
                            : ev.roleType === 'propagation'
                              ? 'bg-[#C5A945]/20 text-[#C5A945] border-[#C5A945]'
                              : 'bg-[#1A1A1A]/10 text-[#1A1A1A] border-[#1A1A1A]/30'
                        }`}>
                          {ev.role}
                        </span>
                        <div className="text-[11px] sm:text-xs text-[#625A50] mt-1 font-medium">
                          Support: {ev.evidenceSupport}
                        </div>
                      </td>

                      {/* Preventable */}
                      <td className="py-3 px-3.5 text-center">
                        {ev.prevented ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 border border-emerald-400 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>YES (T−10s)</span>
                          </span>
                        ) : (
                          <span className="inline-block text-xs font-bold text-[#DC143C] bg-[#DC143C]/10 px-2.5 py-1 border border-[#DC143C]/30 shadow-2xs">
                            ORIGIN (NO)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 2: ROOT CAUSE MECHANISM & COUNTERFACTUAL VERDICT
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Left: Physics Analysis */}
            <div className="border-2 border-[#1A1A1A] p-5 bg-[#FAF6EE]/42 backdrop-blur-xs flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1A1A1A]/20">
                  <Flame className="w-5 h-5 text-[#DC143C]" />
                  <h3 className="font-headline font-black text-base sm:text-lg uppercase text-[#1A1A1A] tracking-wide">
                    2. Physical Root-Cause Mechanism
                  </h3>
                </div>
                
                <p className="text-xs sm:text-sm font-mono-tech text-[#1A1A1A] leading-relaxed mb-4">
                  Upon orbital eclipse exit at 12:41:03 UTC, rapid thermal expansion triggered micro-cracking across the analog thermistor solder joint. This open circuit induced a negative rail saturation code (<code className="bg-[#FAF6EE]/70 px-1.5 py-0.5 border border-[#1A1A1A]/30 text-[#DC143C] font-bold">0x0012 = -240.2°C</code>).
                </p>

                <div className="bg-[#FAF6EE]/50 backdrop-blur-xs p-3.5 border border-[#1A1A1A]/20 text-xs sm:text-sm font-mono-tech space-y-2 text-[#1A1A1A]">
                  <div><strong className="text-[#DC143C]">Flaw Identified:</strong> Missing deadband sanity boundary clamp in flight software.</div>
                  <div><strong className="text-[#1A1A1A]">Unintended Reaction:</strong> Survival heater locked at 100% duty cycle (28.4W drain).</div>
                  <div><strong className="text-[#DC143C]">Catastrophic Climax:</strong> Complete power bus UVLO trip & transceiver cutoff at 12:44:07 UTC.</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between text-xs font-mono-tech text-[#625A50] font-bold">
                <span>ANOMALY REPRODUCED IN MISSION LAB</span>
                <span className="font-black text-[#1A1A1A]">MODEL CONFIDENCE: 0.94</span>
              </div>
            </div>

            {/* Right: Counterfactual & Corrective Action */}
            <div className="border-2 border-[#DC143C] p-5 bg-[#FAF6EE]/42 backdrop-blur-xs flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#DC143C]/30">
                  <Sparkles className="w-5 h-5 text-[#DC143C]" />
                  <h3 className="font-headline font-black text-base sm:text-lg uppercase text-[#DC143C] tracking-wide">
                    3. Counterfactual Prevention Verdict
                  </h3>
                </div>

                <div className="bg-[#DC143C]/10 backdrop-blur-xs border border-[#DC143C]/30 p-3.5 mb-4 text-xs sm:text-sm font-mono-tech">
                  <div className="font-black text-[#DC143C] mb-1.5 text-xs sm:text-sm">
                    RESULT: 5 OF 6 CASCADE FAILURES PREVENTABLE
                  </div>
                  <p className="text-[#1A1A1A] leading-relaxed">
                    Executing an automated sensor plausibility check <strong className="text-[#DC143C]">T−10s</strong> before heater engagement prevents all subsequent thermal, electrical, and telecommunication collapses.
                  </p>
                </div>

                <ul className="text-xs sm:text-sm font-mono-tech space-y-2 text-[#1A1A1A]">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span><strong>Power Preservation:</strong> Prevents 24.6 Wh battery depletion.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span><strong>Comms Availability:</strong> Continuous RF beacon beaconing maintained.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span><strong>Spacecraft Survival:</strong> Orbit operation remains 100% mission-capable.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1A1A1A]/20 flex items-center justify-between text-xs font-mono-tech text-[#C5A945] font-black">
                <span>RECOVERY VERIFICATION: CONFIRMED</span>
                <span>EARLIEST INTERVENTION: T−10s</span>
              </div>
            </div>

          </div>

          {/* ─────────────────────────────────────────────────────────────
              FOOTER: SIGN-OFF & FORMAL CERTIFICATION
          ───────────────────────────────────────────────────────────── */}
          <div className="border-t-4 border-[#1A1A1A] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm font-mono-tech">
            
            <div>
              <div className="font-bold text-[#1A1A1A] uppercase tracking-wider text-sm sm:text-base">
                {reportData.signOff.leadInvestigator}
              </div>
              <div className="text-xs text-[#625A50] font-medium mt-0.5">
                Validated via {reportData.signOff.aiEngine} · {reportData.signOff.standard}
              </div>
              <div className="text-[11px] sm:text-xs text-[#1A1A1A]/70 mt-1 font-mono font-semibold">
                {reportData.signOff.validationHash}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#DC143C]" />
                <span className="font-black text-[#1A1A1A] uppercase text-sm sm:text-base">CASE STATUS: RESOLVED</span>
              </div>
              <span className="text-xs font-mono-tech text-[#C5A945] font-black mt-0.5">
                ARCHIVED IN ORBITAL ANOMALY DATABASE
              </span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
