/**
 * MACHINE WHISPERER — LIQUID GLASS + 3D CHROME RING EXPERIENCE
 * Fully Interactive Workstation · 60fps Signal Processing · 100% Offline-Ready
 */

(() => {
  "use strict";

  const startTime = Date.now();

  // Application State
  const state = {
    activeView: "overview",
    selectedMachineId: "fan_id_00",
    mode: "demo",
    channels: 1,
    sampleRate: 16000,
    timeRange: "30s", // 30s, 1m, 5m, 15m
    isSignalPaused: false,

    // Live Telemetry
    liveDoa: 0.0,
    targetDoa: 0.0,
    smoothedDoa: 0.0,
    spectrumTarget: new Float32Array(32),
    spectrumCurrent: new Float32Array(32),
    spectrumPeak: new Float32Array(32),
    spectrumPeakHoldTimer: new Int32Array(32),

    // Waveform Simulation/Display Buffer (512 samples)
    waveformBuffer: new Float32Array(512),
    waveformScanPhase: 0,

    machines: [],
    machineHistories: {}, // machineId -> Array of historical health values
    events: [],
    knownEventIds: new Set(),
    hasPolledOnce: false,
    systemAlarmActive: false,
    initialLoadDismissed: false,

    // Event Log Filters & Search
    eventSearchQuery: "",
    eventFilterMachine: "all",
    eventFilterFault: "all",
    eventSortBy: "time-desc",

    // Simulation Timer
    simTimerId: null,
    simCountdown: 0,
  };

  // DOM Elements - Shell
  const elLoadingScreen = document.getElementById("loading-screen");
  const elSidebarStatusDot = document.getElementById("sidebar-status-dot");
  const elSidebarStatusText = document.getElementById("sidebar-status-text");
  const elBtnLive = document.getElementById("btn-mode-live");
  const elBtnDemo = document.getElementById("btn-mode-demo");
  const navButtons = document.querySelectorAll(".sidebar-nav .nav-item");
  const viewPanels = document.querySelectorAll(".view-panel");

  // Clocks
  const clocks = [
    document.getElementById("clock-overview"),
    document.getElementById("clock-signals"),
    document.getElementById("clock-diagnostics"),
    document.getElementById("clock-events"),
    document.getElementById("clock-settings"),
  ];

  // Overview View Elements & KPI Cards
  const elKpiTotalMachines = document.getElementById("kpi-total-machines");
  const elKpiHealthyMachines = document.getElementById("kpi-healthy-machines");
  const elKpiHealthyBadge = document.getElementById("kpi-healthy-badge");
  const elKpiHealthySub = document.getElementById("kpi-healthy-sub");
  const elKpiActiveFaults = document.getElementById("kpi-active-faults");
  const elKpiFaultsBadge = document.getElementById("kpi-faults-badge");
  const elKpiFaultsSub = document.getElementById("kpi-faults-sub");
  const elKpiSystemHealth = document.getElementById("kpi-system-health");
  const elKpiHealthBar = document.getElementById("kpi-health-bar");

  const elOverviewTimeRange = document.getElementById("overview-time-range");
  const elDemoDropdownContainer = document.getElementById("demo-dropdown-container");
  const elBtnDemoPopover = document.getElementById("btn-demo-popover");
  const elDemoPopoverMenu = document.getElementById("demo-popover-menu");
  const elPopoverMachineSelect = document.getElementById("popover-machine-select");
  const elPopoverTimerRow = document.getElementById("popover-timer-row");
  const elPopoverTimerBadge = document.getElementById("popover-timer-badge");
  const elOverviewAssetsGrid = document.getElementById("overview-assets-grid");
  const elOverviewSpectrumPeak = document.getElementById("overview-spectrum-peak");
  const elOverviewDoaReadout = document.getElementById("overview-doa-readout");

  // Live Signal View Elements
  const elBtnSignalPause = document.getElementById("btn-signal-pause");
  const elBtnSignalPauseText = document.getElementById("btn-signal-pause-text");
  const elBtnSignalReset = document.getElementById("btn-signal-reset");
  const elSignalsChannelInfo = document.getElementById("signals-channel-info");
  const elOscilloscopeStatus = document.getElementById("oscilloscope-status-text");
  const elMetricPeakFreq = document.getElementById("metric-peak-freq");
  const elMetricRmsAmp = document.getElementById("metric-rms-amp");
  const elMetricCentroid = document.getElementById("metric-centroid");
  const elMetricCrest = document.getElementById("metric-crest");
  const elSignalsSpectrumPeak = document.getElementById("signals-spectrum-peak");
  const elSignalsDoaReadout = document.getElementById("signals-doa-readout");
  const elSignalsMetricsTbody = document.getElementById("signals-metrics-tbody");

  // Diagnostics View Elements
  const elBtnDiagBack = document.getElementById("btn-diag-back-overview");
  const elDiagMachineTabs = document.getElementById("diag-machine-tabs");
  const elDiagHeroName = document.getElementById("diag-hero-machine-name");
  const elDiagHeroStatusPill = document.getElementById("diag-hero-status-pill");
  const elDiagHeroAngle = document.getElementById("diag-hero-angle");
  const elDiagHeroHealth = document.getElementById("diag-hero-health");
  const elDiagExplanationTitle = document.getElementById("diag-explanation-title");
  const elDiagExplanationBody = document.getElementById("diag-explanation-body");
  const elDiagReadoutThreshold = document.getElementById("diag-readout-threshold");
  const elDiagCurrentScore = document.getElementById("diag-current-score");
  const elDiagCurrentThreshold = document.getElementById("diag-current-threshold");
  const elDiagCurrentDebounce = document.getElementById("diag-current-debounce");
  const elDiagReadoutBearing = document.getElementById("diag-readout-bearing");
  const elDiagEventsTbody = document.getElementById("diag-events-tbody");

  // Feature Status Badges in Diagnostics
  const elFeatImbalance = document.getElementById("feat-imbalance-status");
  const elFeatMisalignment = document.getElementById("feat-misalignment-status");
  const elFeatBearing = document.getElementById("feat-bearing-status");
  const elFeatCavitation = document.getElementById("feat-cavitation-status");
  const elFeatAngle = document.getElementById("feat-angle-status");

  // Settings View Elements
  const elSettingsChannelBadge = document.getElementById("settings-channel-badge");
  const elSettingsHwPlatform = document.getElementById("settings-hw-platform");
  const elSettingsM1State = document.getElementById("settings-m1-state");
  const elSettingsM2State = document.getElementById("settings-m2-state");
  const elSettingsBuzzerState = document.getElementById("settings-buzzer-state");

  // Sidebar Hardware Pin Elements (Dual-Machine + Buzzer)
  const elHwPlatformTag = document.getElementById("hw-platform-tag");
  const elPinPillM1 = document.getElementById("pin-pill-m1");
  const elPinDotM1 = document.getElementById("pin-dot-m1");
  const elPinNameM1 = document.getElementById("pin-name-m1");
  const elPinPillM2 = document.getElementById("pin-pill-m2");
  const elPinDotM2 = document.getElementById("pin-dot-m2");
  const elPinNameM2 = document.getElementById("pin-name-m2");
  const elPinPillBuzzer = document.getElementById("pin-pill-buzzer");
  const elPinPillI2s = document.getElementById("pin-pill-i2s");

  // Audio Testing & Calibration Elements
  const elAudioFileSelect = document.getElementById("audio-file-select");
  const elBtnRunFileTest = document.getElementById("btn-run-file-test");
  const elTestAudioResultRow = document.getElementById("test-audio-result-row");
  const elTestFileResultDesc = document.getElementById("test-file-result-desc");
  const elTestFileResultBadge = document.getElementById("test-file-result-badge");
  const elCalibrateMachineSelect = document.getElementById("calibrate-machine-select");
  const elInputCalibrateThreshold = document.getElementById("input-calibrate-threshold");
  const elBtnSaveThreshold = document.getElementById("btn-save-threshold");
  const elBtnAutoCalibrate = document.getElementById("btn-auto-calibrate");

  // Event Log View Elements
  const elEventSearchInput = document.getElementById("event-search-input");
  const elEventMachineFilter = document.getElementById("event-machine-filter");
  const elEventFaultFilter = document.getElementById("event-fault-filter");
  const elEventSortSelect = document.getElementById("event-sort-select");
  const elBtnExportCsv = document.getElementById("btn-export-csv");
  const elBtnClearEventsModal = document.getElementById("btn-clear-events-modal");
  const elEventsTbody = document.getElementById("events-tbody");

  // Modals Elements
  const elModalEventDetail = document.getElementById("modal-event-detail");
  const elBtnCloseEventDetail = document.getElementById("btn-close-event-detail");
  const elBtnDetailDone = document.getElementById("btn-detail-done");
  const elDetailEventId = document.getElementById("detail-event-id");
  const elDetailMachine = document.getElementById("detail-machine");
  const elDetailTimestamp = document.getElementById("detail-timestamp");
  const elDetailHealth = document.getElementById("detail-health");
  const elDetailFault = document.getElementById("detail-fault");
  const elDetailScore = document.getElementById("detail-score");
  const elDetailBearing = document.getElementById("detail-bearing");
  const elDetailExpText = document.getElementById("detail-explanation-text");

  const elModalClearConfirm = document.getElementById("modal-clear-confirm");
  const elBtnCloseClearModal = document.getElementById("btn-close-clear-modal");
  const elBtnCancelClear = document.getElementById("btn-cancel-clear");
  const elBtnConfirmClear = document.getElementById("btn-confirm-clear");

  // Canvases & Contexts
  const canvasSpectrumOverview = document.getElementById("spectrum-canvas-overview");
  const ctxSpectrumOverview = canvasSpectrumOverview?.getContext("2d");
  const tooltipSpectrumOverview = document.getElementById("spectrum-tooltip-overview");

  const canvasDoaOverview = document.getElementById("doa-canvas-overview");
  const ctxDoaOverview = canvasDoaOverview?.getContext("2d");
  const tooltipDoaOverview = document.getElementById("doa-tooltip-overview");

  const canvasWaveform = document.getElementById("waveform-canvas");
  const ctxWaveform = canvasWaveform?.getContext("2d");

  const canvasSpectrumSignals = document.getElementById("spectrum-canvas-signals");
  const ctxSpectrumSignals = canvasSpectrumSignals?.getContext("2d");
  const tooltipSpectrumSignals = document.getElementById("spectrum-tooltip-signals");

  const canvasDoaSignals = document.getElementById("doa-canvas-signals");
  const ctxDoaSignals = canvasDoaSignals?.getContext("2d");
  const tooltipDoaSignals = document.getElementById("doa-tooltip-signals");

  const canvasDiagTimeline = document.getElementById("diag-timeline-canvas");
  const ctxDiagTimeline = canvasDiagTimeline?.getContext("2d");

  const canvasDiagMachineDoa = document.getElementById("diag-machine-doa-canvas");
  const ctxDiagMachineDoa = canvasDiagMachineDoa?.getContext("2d");

  // ==========================================================================
  // SYSTEM CLOCK
  // ==========================================================================
  function updateClock() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const timeStr = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;

    clocks.forEach((el) => {
      if (el) el.textContent = timeStr;
    });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ==========================================================================
  // STARTUP LOADING SCREEN (Smooth 300ms fadeout after min 450ms)
  // ==========================================================================
  function dismissLoadingScreen() {
    if (state.initialLoadDismissed) return;
    state.initialLoadDismissed = true;

    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, 450 - elapsed);

    setTimeout(() => {
      if (elLoadingScreen) {
        elLoadingScreen.classList.add("fade-out");
        setTimeout(() => {
          if (elLoadingScreen.parentNode) {
            elLoadingScreen.parentNode.removeChild(elLoadingScreen);
          }
        }, 350);
      }
    }, delay);
  }

  // ==========================================================================
  // MULTI-VIEW NAVIGATION & TAB SWITCHING
  // ==========================================================================
  function switchView(viewName) {
    state.activeView = viewName;

    navButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    viewPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `view-${viewName}`);
    });

    // Invalidate cached canvas bounds for newly revealed view
    invalidateAllCanvasDims();

    if (viewName === "diagnostics") {
      updateDiagnosticsView();
    }
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
    });
  });

  elBtnDiagBack?.addEventListener("click", () => {
    switchView("overview");
  });

  // Time Range Selection (Overview)
  elOverviewTimeRange?.querySelectorAll(".time-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      elOverviewTimeRange.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.timeRange = btn.dataset.range;
      renderOverviewCards(state.machines);
    });
  });

  // ==========================================================================
  // DEMO SIMULATE FAULT POPOVER
  // ==========================================================================
  if (elBtnDemoPopover && elDemoPopoverMenu) {
    elBtnDemoPopover.addEventListener("click", (e) => {
      e.stopPropagation();
      elDemoPopoverMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!elDemoDropdownContainer.contains(e.target)) {
        elDemoPopoverMenu.classList.add("hidden");
      }
    });

    elDemoPopoverMenu.querySelectorAll(".fault-pick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fault = btn.dataset.fault;
        const targetMachine = elPopoverMachineSelect.value;
        if (targetMachine) {
          injectFaultWithAutoReset(targetMachine, fault);
          elDemoPopoverMenu.classList.add("hidden");
        }
      });
    });
  }

  function injectFaultWithAutoReset(machineId, fault) {
    if (state.simTimerId) {
      clearInterval(state.simTimerId);
      state.simTimerId = null;
    }

    injectFault(machineId, fault);

    if (fault !== "normal") {
      state.simCountdown = 30; // 30-second duration auto-reset
      if (elPopoverTimerRow) elPopoverTimerRow.style.display = "block";
      if (elPopoverTimerBadge) elPopoverTimerBadge.textContent = `Active fault: Auto-reset in ${state.simCountdown}s`;

      state.simTimerId = setInterval(() => {
        state.simCountdown--;
        if (state.simCountdown <= 0) {
          clearInterval(state.simTimerId);
          state.simTimerId = null;
          injectFault(machineId, "normal");
          if (elPopoverTimerRow) elPopoverTimerRow.style.display = "none";
        } else {
          if (elPopoverTimerBadge) elPopoverTimerBadge.textContent = `Active fault: Auto-reset in ${state.simCountdown}s`;
        }
      }, 1000);
    } else {
      if (elPopoverTimerRow) elPopoverTimerRow.style.display = "none";
    }
  }

  function updatePopoverMachines(machines) {
    if (!elPopoverMachineSelect) return;
    const currentVal = elPopoverMachineSelect.value;
    const existing = Array.from(elPopoverMachineSelect.options).map((o) => o.value);
    const newIds = machines.map((m) => m.id);

    if (JSON.stringify(existing) !== JSON.stringify(newIds)) {
      elPopoverMachineSelect.innerHTML = "";
      machines.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.enrolled_angle >= 0 ? "+" : ""}${m.enrolled_angle.toFixed(0)}°)`;
        elPopoverMachineSelect.appendChild(opt);
      });
      if (currentVal && machines.some((m) => m.id === currentVal)) {
        elPopoverMachineSelect.value = currentVal;
      }
    }
  }

  // ==========================================================================
  // CANVAS RESIZING UTILITY (HiDPI Sharpness & Layout Cache - Prevents Reflow)
  // ==========================================================================
  const canvasDimsCache = new WeakMap();

  function invalidateAllCanvasDims() {
    [canvasSpectrumOverview, canvasDoaOverview, canvasWaveform, canvasSpectrumSignals, canvasDoaSignals, canvasDiagTimeline, canvasDiagMachineDoa].forEach((c) => {
      if (c) canvasDimsCache.delete(c);
    });
  }

  window.addEventListener("resize", invalidateAllCanvasDims, { passive: true });

  function resizeCanvas(canvas, ctx) {
    // Cap pixel ratio to 1.5 to eliminate 4x fragment shader fillrate spikes
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let dims = canvasDimsCache.get(canvas);
    if (!dims || dims.width === 0 || dims.height === 0) {
      const rect = canvas.getBoundingClientRect();
      dims = { width: rect.width, height: rect.height };
      canvasDimsCache.set(canvas, dims);
    }

    const w = Math.floor(dims.width * dpr);
    const h = Math.floor(dims.height * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    }
    return dims;
  }

  // ==========================================================================
  // REAL-TIME OSCILLOSCOPE TIME-DOMAIN WAVEFORM (Live Signal View)
  // ==========================================================================
  function synthesizeWaveform() {
    if (state.isSignalPaused) return;

    let dominantFault = "normal";
    const abnormal = state.machines.find((m) => m.alarm || m.is_abnormal);
    if (abnormal) dominantFault = (abnormal.demo_fault || abnormal.fault).toLowerCase();

    state.waveformScanPhase += 0.08;
    const buffer = state.waveformBuffer;
    const len = buffer.length;

    for (let i = 0; i < len; i++) {
      const t = (i / len) * 2 * Math.PI + state.waveformScanPhase;
      let sample = 0;

      if (dominantFault === "imbalance") {
        sample = 0.75 * Math.sin(t * 2) + 0.15 * Math.sin(t * 8) + (Math.random() - 0.5) * 0.08;
      } else if (dominantFault === "misalignment") {
        sample = 0.45 * Math.sin(t * 2) + 0.40 * Math.sin(t * 4) + 0.25 * Math.sin(t * 6) + (Math.random() - 0.5) * 0.08;
      } else if (dominantFault === "bearing_wear") {
        const pulse = Math.pow(Math.sin(t * 1.5) * 0.5 + 0.5, 12);
        const ring = Math.sin(t * 32) * Math.exp(-((i % 40) / 10));
        sample = pulse * ring * 0.85 + (Math.random() - 0.5) * 0.15;
      } else if (dominantFault === "cavitation") {
        sample = (Math.random() - 0.5) * 0.70 + 0.25 * Math.sin(t * 14);
      } else {
        sample = 0.25 * Math.sin(t * 2) + 0.15 * Math.sin(t * 5) + (Math.random() - 0.5) * 0.05;
      }

      buffer[i] = sample;
    }
  }

  function renderOscilloscope() {
    if (!canvasWaveform || !ctxWaveform || canvasWaveform.offsetWidth === 0) return;

    const { width, height } = resizeCanvas(canvasWaveform, ctxWaveform);
    ctxWaveform.clearRect(0, 0, width, height);

    // Translucent Liquid Glass Background (allows 3D chrome ring to shine through)
    ctxWaveform.fillStyle = "rgba(13, 19, 28, 0.28)";
    ctxWaveform.fillRect(0, 0, width, height);

    // Subtle Grid lines (voltage divisions)
    ctxWaveform.strokeStyle = "rgba(120, 183, 245, 0.10)";
    ctxWaveform.lineWidth = 1;

    const gridX = 10;
    const gridY = 6;
    for (let i = 1; i < gridX; i++) {
      const x = (width / gridX) * i;
      ctxWaveform.beginPath();
      ctxWaveform.moveTo(x, 0);
      ctxWaveform.lineTo(x, height);
      ctxWaveform.stroke();
    }
    for (let j = 1; j < gridY; j++) {
      const y = (height / gridY) * j;
      ctxWaveform.beginPath();
      ctxWaveform.moveTo(0, y);
      ctxWaveform.lineTo(width, y);
      ctxWaveform.stroke();
    }

    // Zero-Crossing Center Line
    const cy = height / 2;
    ctxWaveform.strokeStyle = "rgba(120, 183, 245, 0.25)";
    ctxWaveform.beginPath();
    ctxWaveform.moveTo(0, cy);
    ctxWaveform.lineTo(width, cy);
    ctxWaveform.stroke();

    // Render Waveform Trace in Neon Cyan (#8BE2E8) or Coral (#E56F75)
    // Uses double-pass stroke for glow halo without expensive Gaussian shadowBlur
    synthesizeWaveform();
    const buffer = state.waveformBuffer;
    const len = buffer.length;
    const stepX = width / (len - 1);

    const traceColor = state.systemAlarmActive ? "#E56F75" : "#8BE2E8";
    const haloColor = state.systemAlarmActive ? "rgba(229, 111, 117, 0.35)" : "rgba(139, 226, 232, 0.35)";

    // Pass 1: Luminous soft halo
    ctxWaveform.beginPath();
    ctxWaveform.strokeStyle = haloColor;
    ctxWaveform.lineWidth = 4.0;
    for (let i = 0; i < len; i++) {
      const x = i * stepX;
      const y = cy - buffer[i] * (height * 0.42);
      if (i === 0) ctxWaveform.moveTo(x, y);
      else ctxWaveform.lineTo(x, y);
    }
    ctxWaveform.stroke();

    // Pass 2: Sharp core trace
    ctxWaveform.beginPath();
    ctxWaveform.strokeStyle = traceColor;
    ctxWaveform.lineWidth = 1.8;
    for (let i = 0; i < len; i++) {
      const x = i * stepX;
      const y = cy - buffer[i] * (height * 0.42);
      if (i === 0) ctxWaveform.moveTo(x, y);
      else ctxWaveform.lineTo(x, y);
    }
    ctxWaveform.stroke();
  }

  // Playback Pause/Resume & Reset Controls
  elBtnSignalPause?.addEventListener("click", () => {
    state.isSignalPaused = !state.isSignalPaused;
    if (state.isSignalPaused) {
      elBtnSignalPause.classList.add("paused");
      elBtnSignalPauseText.textContent = "Resume";
      if (elOscilloscopeStatus) elOscilloscopeStatus.textContent = "Signal Frozen (Paused)";
    } else {
      elBtnSignalPause.classList.remove("paused");
      elBtnSignalPauseText.textContent = "Pause";
      if (elOscilloscopeStatus) elOscilloscopeStatus.textContent = "Scanning 60 fps";
    }
  });

  elBtnSignalReset?.addEventListener("click", () => {
    state.spectrumPeak.fill(0);
    state.spectrumPeakHoldTimer.fill(0);
  });

  // ==========================================================================
  // FFT FREQUENCY SPECTRUM ANALYZER (Liquid Glass Styling)
  // ==========================================================================
  const FREQ_TICKS = [
    { freq: "50Hz", bin: 1 },
    { freq: "200Hz", bin: 5 },
    { freq: "500Hz", bin: 10 },
    { freq: "1kHz", bin: 16 },
    { freq: "2kHz", bin: 21 },
    { freq: "4kHz", bin: 26 },
    { freq: "8kHz", bin: 31 },
  ];

  let spectrumHoverState = {
    active: false,
    mouseX: 0,
    mouseY: 0,
    targetCanvas: null,
  };

  function bindSpectrumHover(canvas, tooltipEl) {
    if (!canvas || !tooltipEl) return;
    let hoverRaf = false;

    canvas.addEventListener("mousemove", (e) => {
      if (hoverRaf) return;
      hoverRaf = true;
      requestAnimationFrame(() => {
        hoverRaf = false;
        const rect = canvas.getBoundingClientRect();
        const paddingLeft = 36;
        const paddingRight = 14;
        const plotWidth = rect.width - paddingLeft - paddingRight;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (mouseX >= paddingLeft && mouseX <= rect.width - paddingRight) {
          const pct = (mouseX - paddingLeft) / plotWidth;
          const binIndex = Math.min(31, Math.max(0, Math.round(pct * 31)));
          const freqApprox = Math.round(20 * Math.pow(8000 / 20, pct));
          const val = state.spectrumCurrent[binIndex];
          const dbApprox = (val * 60 - 60).toFixed(1);

          tooltipEl.style.left = `${Math.min(rect.width - 120, Math.max(10, mouseX - 50))}px`;
          tooltipEl.style.top = `${Math.max(8, mouseY - 28)}px`;
          tooltipEl.textContent = `${freqApprox >= 1000 ? (freqApprox / 1000).toFixed(1) + " kHz" : freqApprox + " Hz"} · ${dbApprox} dBFS`;
          tooltipEl.classList.remove("hidden");

          spectrumHoverState.active = true;
          spectrumHoverState.mouseX = mouseX;
          spectrumHoverState.targetCanvas = canvas;
        } else {
          tooltipEl.classList.add("hidden");
          spectrumHoverState.active = false;
        }
      });
    }, { passive: true });

    canvas.addEventListener("mouseleave", () => {
      tooltipEl.classList.add("hidden");
      spectrumHoverState.active = false;
    });
  }

  bindSpectrumHover(canvasSpectrumOverview, tooltipSpectrumOverview);
  bindSpectrumHover(canvasSpectrumSignals, tooltipSpectrumSignals);

  function drawSpectrumOnCanvas(canvas, ctx, peakTextEl) {
    if (!canvas || !ctx || canvas.offsetWidth === 0) return;

    const { width, height } = resizeCanvas(canvas, ctx);
    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 36;
    const paddingRight = 14;
    const paddingTop = 14;
    const paddingBottom = 22;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    if (plotWidth <= 0 || plotHeight <= 0) return;

    // Horizontal dB Gridlines
    const dbSteps = [
      { db: "0 dB", pct: 1.0 },
      { db: "-12 dB", pct: 0.75 },
      { db: "-24 dB", pct: 0.50 },
      { db: "-36 dB", pct: 0.25 },
      { db: "-48 dB", pct: 0.05 },
    ];

    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#8291A5";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (const step of dbSteps) {
      const y = paddingTop + plotHeight * (1.0 - step.pct);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
      ctx.lineWidth = 1;
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      ctx.fillText(step.db, paddingLeft - 6, y);
    }

    const numBins = 32;
    const stepX = plotWidth / (numBins - 1);
    const points = [];
    let maxDbReached = -60;
    let peakBinIdx = 0;
    let peakBinVal = 0;

    for (let i = 0; i < numBins; i++) {
      const current = state.spectrumCurrent[i];
      const peak = state.spectrumPeak[i];

      const x = paddingLeft + i * stepX;
      const y = paddingTop + plotHeight * (1.0 - Math.min(1.0, current));
      points.push({ x, y, current, peak });

      const dbVal = 20 * Math.log10(current + 1e-4);
      if (dbVal > maxDbReached) {
        maxDbReached = dbVal;
        peakBinIdx = i;
        peakBinVal = current;
      }
    }

    // Luminous Electric Blue / Cyan Gradient Area Fill
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, paddingTop + plotHeight);
      ctx.lineTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(points[points.length - 1].x, paddingTop + plotHeight);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + plotHeight);
      grad.addColorStop(0, "rgba(120, 183, 245, 0.35)");
      grad.addColorStop(0.5, "rgba(139, 226, 232, 0.15)");
      grad.addColorStop(1, "rgba(18, 26, 38, 0.0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Pass 1: Luminous soft halo (zero shadowBlur Gaussian overhead)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = "rgba(120, 183, 245, 0.35)";
      ctx.lineWidth = 4.0;
      ctx.stroke();

      // Pass 2: Electric Blue (#78B7F5) Crisp Core Trace
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i].x + points[i - 1].x) / 2;
        const yc = (points[i].y + points[i - 1].y) / 2;
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.strokeStyle = "#78B7F5";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Lavender / Coral Peak-Hold Markers
    ctx.strokeStyle = "#B9B9F0";
    ctx.lineWidth = 1.6;
    for (const pt of points) {
      if (pt.peak > 0.05) {
        const peakY = paddingTop + plotHeight * (1.0 - Math.min(1.0, pt.peak));
        ctx.beginPath();
        ctx.moveTo(pt.x - 3, peakY);
        ctx.lineTo(pt.x + 3, peakY);
        ctx.stroke();
      }
    }

    // Peak Frequency Dot Marker
    if (points[peakBinIdx] && peakBinVal > 0.15) {
      const pkPt = points[peakBinIdx];
      ctx.beginPath();
      ctx.arc(pkPt.x, pkPt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#8BE2E8";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Bottom Frequency Labels
    ctx.fillStyle = "#8291A5";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const item of FREQ_TICKS) {
      const x = paddingLeft + item.bin * stepX;
      ctx.fillText(item.freq, x, height - paddingBottom + 6);
    }

    // Interactive Hover Crosshair
    if (spectrumHoverState.active && spectrumHoverState.targetCanvas === canvas) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(120, 183, 245, 0.6)";
      ctx.setLineDash([3, 3]);
      ctx.moveTo(spectrumHoverState.mouseX, paddingTop);
      ctx.lineTo(spectrumHoverState.mouseX, paddingTop + plotHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Update Peak Readout Text
    if (peakTextEl) {
      const clampedDb = Math.max(-60, Math.min(0, maxDbReached)).toFixed(1);
      peakTextEl.textContent = `Peak: ${clampedDb} dB`;
    }

    // Update Live Signal Metrics Strip (Live Signal view)
    if (state.activeView === "signals") {
      const approxPeakHz = Math.round(20 * Math.pow(8000 / 20, peakBinIdx / 31));
      if (elMetricPeakFreq) elMetricPeakFreq.textContent = approxPeakHz >= 1000 ? `${(approxPeakHz / 1000).toFixed(1)} kHz` : `${approxPeakHz} Hz`;
      if (elMetricRmsAmp) elMetricRmsAmp.textContent = `${Math.max(-60, Math.min(0, maxDbReached)).toFixed(1)} dBFS`;

      let sumMag = 0, sumWeighted = 0;
      for (let i = 0; i < 32; i++) {
        const f = 20 * Math.pow(8000 / 20, i / 31);
        const m = state.spectrumCurrent[i];
        sumMag += m;
        sumWeighted += f * m;
      }
      const centroidHz = sumMag > 0 ? Math.round(sumWeighted / sumMag) : 1200;
      if (elMetricCentroid) elMetricCentroid.textContent = centroidHz >= 1000 ? `${(centroidHz / 1000).toFixed(2)} kHz` : `${centroidHz} Hz`;
      if (elMetricCrest) elMetricCrest.textContent = `${(10 + peakBinVal * 8).toFixed(1)} dB`;
    }
  }

  // ==========================================================================
  // ACOUSTIC DOA BEARING PLOT (Liquid Glass Polar Beamformer)
  // ==========================================================================
  function bindDoaHover(canvas, tooltipEl) {
    if (!canvas || !tooltipEl) return;
    let hoverRaf = false;

    canvas.addEventListener("mousemove", (e) => {
      if (hoverRaf) return;
      hoverRaf = true;
      requestAnimationFrame(() => {
        hoverRaf = false;
        const rect = canvas.getBoundingClientRect();
        const paddingTop = 32;
        const paddingBottom = 48; // increased by 24px
        const paddingSides = 85;  // increased by 20px
        const cx = rect.width / 2;
        const cy = rect.height - paddingBottom;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let matchedMachine = null;

        for (const m of state.machines) {
          const enrolledDeg = m.enrolled_angle || 0;
          const rad = (enrolledDeg - 90) * (Math.PI / 180);
          const maxRadiusW = (rect.width - 2 * paddingSides) / 2;
          const maxRadiusH = rect.height - paddingTop - paddingBottom;
          const radius = Math.max(30, Math.min(maxRadiusW, maxRadiusH));
          const mx = cx + radius * Math.cos(rad);
          const my = cy + radius * Math.sin(rad);

          const dist = Math.hypot(mouseX - mx, mouseY - my);
          if (dist < 20) {
            matchedMachine = m;
            break;
          }
        }

        if (matchedMachine) {
          tooltipEl.style.left = `${Math.min(rect.width - 140, Math.max(10, mouseX - 60))}px`;
          tooltipEl.style.top = `${Math.max(8, mouseY - 32)}px`;
          tooltipEl.textContent = `${matchedMachine.name} · Angle: ${matchedMachine.enrolled_angle.toFixed(1)}° · ${matchedMachine.alarm ? "ALARM" : "Healthy"}`;
          tooltipEl.classList.remove("hidden");
        } else {
          tooltipEl.classList.add("hidden");
        }
      });
    }, { passive: true });

    canvas.addEventListener("mouseleave", () => {
      tooltipEl.classList.add("hidden");
    });
  }

  bindDoaHover(canvasDoaOverview, tooltipDoaOverview);
  bindDoaHover(canvasDoaSignals, tooltipDoaSignals);

  function drawDoaOnCanvas(canvas, ctx, readoutEl) {
    if (!canvas || !ctx || canvas.offsetWidth === 0) return;

    const { width, height } = resizeCanvas(canvas, ctx);
    ctx.clearRect(0, 0, width, height);

    const paddingTop = 32;
    const paddingBottom = 48; // increased by 24px
    const paddingSides = 85;  // increased by 20px

    const cx = width / 2;
    const cy = height - paddingBottom;
    const maxRadiusW = (width - 2 * paddingSides) / 2;
    const maxRadiusH = height - paddingTop - paddingBottom;
    const radius = Math.max(30, Math.min(maxRadiusW, maxRadiusH));

    // Concentric Range Rings
    const ringFactors = [0.33, 0.66, 1.0];
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;

    for (const rFactor of ringFactors) {
      const r = radius * rFactor;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 0, false);
      ctx.stroke();
    }

    // Baseline axis
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.moveTo(cx - radius - 10, cy);
    ctx.lineTo(cx + radius + 10, cy);
    ctx.stroke();

    // Degree Ticks & Labels (-90 to +90)
    const tickAngles = [-90, -75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90];
    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const deg of tickAngles) {
      const rad = (deg - 90) * (Math.PI / 180);
      const isMajor = deg % 30 === 0;

      const innerR = radius - (isMajor ? 8 : 4);
      const outerR = radius;

      const x1 = cx + innerR * Math.cos(rad);
      const y1 = cy + innerR * Math.sin(rad);
      const x2 = cx + outerR * Math.cos(rad);
      const y2 = cy + outerR * Math.sin(rad);

      ctx.beginPath();
      ctx.strokeStyle = isMajor ? "#8291A5" : "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isMajor) {
        const labelR = radius + 16;
        const lx = cx + labelR * Math.cos(rad);
        const ly = cy + labelR * Math.sin(rad);
        ctx.fillStyle = deg === 0 ? "#F4F7FC" : "#8291A5";
        ctx.fillText(`${deg > 0 ? "+" : ""}${deg}°`, lx, ly);
      }
    }

    // Glowing Beam Projection Cone
    const needleRad = (state.smoothedDoa - 90) * (Math.PI / 180);
    const coneAngle = 0.16; // ~9 degrees beam width
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius - 2, needleRad - coneAngle, needleRad + coneAngle, false);
    ctx.closePath();
    ctx.fillStyle = state.systemAlarmActive ? "rgba(229, 111, 117, 0.22)" : "rgba(120, 183, 245, 0.20)";
    ctx.fill();

    // Machine Markers on the Arc
    for (const m of state.machines) {
      const enrolledDeg = m.enrolled_angle || 0;
      const rad = (enrolledDeg - 90) * (Math.PI / 180);

      const mx = cx + radius * Math.cos(rad);
      const my = cy + radius * Math.sin(rad);
      const isAlarm = m.alarm;

      // Circle Marker dot on arc
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = isAlarm ? "#E56F75" : "#38A987";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Clean Machine Name Pill Chip with Frosted Glass Background
      const textR = radius - 20;
      const tx = cx + textR * Math.cos(rad);
      const ty = cy + textR * Math.sin(rad);
      const labelText = m.name;

      ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const textWidth = ctx.measureText(labelText).width;

      const chipW = textWidth + 12;
      const chipH = 16;
      // Clamp chip within canvas boundaries with safety margin
      const chipX = Math.max(12, Math.min(width - chipW - 12, tx - chipW / 2));
      const chipY = Math.max(10, Math.min(height - chipH - 10, ty - chipH / 2));

      ctx.fillStyle = isAlarm ? "rgba(45, 25, 32, 0.88)" : "rgba(20, 28, 40, 0.88)";
      ctx.strokeStyle = isAlarm ? "rgba(229, 111, 117, 0.50)" : "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect?.(chipX, chipY, chipW, chipH, 4) || ctx.rect(chipX, chipY, chipW, chipH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isAlarm ? "#E56F75" : "#F4F7FC";
      ctx.fillText(labelText, chipX + chipW / 2, chipY + chipH / 2);
    }

    // Damped Bearing Vector Needle Physics (Smooth Lerp)
    // Uses double-pass stroke for glow halo without expensive Gaussian shadowBlur
    const needleR = radius - 4;
    const nx = cx + needleR * Math.cos(needleRad);
    const ny = cy + needleR * Math.sin(needleRad);
    const needleColor = state.systemAlarmActive ? "#E56F75" : "#78B7F5";
    const needleHalo = state.systemAlarmActive ? "rgba(229, 111, 117, 0.35)" : "rgba(120, 183, 245, 0.35)";

    // Pass 1: Luminous soft halo
    ctx.beginPath();
    ctx.strokeStyle = needleHalo;
    ctx.lineWidth = 4.5;
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Pass 2: Crisp core vector
    ctx.beginPath();
    ctx.strokeStyle = needleColor;
    ctx.lineWidth = 2.0;
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Arrowhead Circle at Vector Tip
    ctx.beginPath();
    ctx.arc(nx, ny, 4, 0, Math.PI * 2);
    ctx.fillStyle = needleColor;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center Pivot Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = needleColor;
    ctx.fill();

    if (readoutEl) {
      const formattedBearing = `${state.smoothedDoa >= 0 ? "+" : ""}${state.smoothedDoa.toFixed(1)}°`;
      readoutEl.textContent = `Bearing: ${formattedBearing}`;
      readoutEl.style.color = state.systemAlarmActive ? "var(--status-alarm)" : "var(--accent-blue)";
    }
  }

  // Mini DOA canvas in Diagnostics View
  function drawMiniDoaOnCanvas(canvas, ctx, enrolledAngle, liveAngle) {
    if (!canvas || !ctx || canvas.offsetWidth === 0) return;

    const { width, height } = resizeCanvas(canvas, ctx);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height - 16;
    const radius = Math.min((width - 60) / 2, height - 32);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - radius - 6, cy);
    ctx.lineTo(cx + radius + 6, cy);
    ctx.stroke();

    const enRad = ((enrolledAngle || 0) - 90) * (Math.PI / 180);
    const mx = cx + radius * Math.cos(enRad);
    const my = cy + radius * Math.sin(enRad);
    ctx.beginPath();
    ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#38A987";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    const lvRad = ((liveAngle || 0) - 90) * (Math.PI / 180);
    const nx = cx + (radius - 2) * Math.cos(lvRad);
    const ny = cy + (radius - 2) * Math.sin(lvRad);
    ctx.beginPath();
    ctx.strokeStyle = "#78B7F5";
    ctx.lineWidth = 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#78B7F5";
    ctx.fill();
  }

  // Global 60FPS Animation Loop (GPU-Friendly with Visibility Pause)
  let isWindowVisible = !document.hidden;
  let animLoopId = null;

  function startAnimationLoop() {
    if (!animLoopId && isWindowVisible) {
      animLoopId = requestAnimationFrame(animationLoop);
    }
  }

  function stopAnimationLoop() {
    if (animLoopId) {
      cancelAnimationFrame(animLoopId);
      animLoopId = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    isWindowVisible = !document.hidden;
    if (isWindowVisible) startAnimationLoop();
    else stopAnimationLoop();
  });

  function animationLoop() {
    animLoopId = null;
    if (!isWindowVisible) return;

    if (!state.isSignalPaused) {
      for (let i = 0; i < 32; i++) {
        const target = state.spectrumTarget[i];
        let current = state.spectrumCurrent[i];
        if (target > current) current += (target - current) * 0.40;
        else current += (target - current) * 0.12;
        state.spectrumCurrent[i] = current;

        let peak = state.spectrumPeak[i];
        let holdTimer = state.spectrumPeakHoldTimer[i];
        if (current >= peak) {
          peak = current;
          holdTimer = 35;
        } else {
          if (holdTimer > 0) holdTimer--;
          else peak = Math.max(0, peak - 0.010);
        }
        state.spectrumPeak[i] = peak;
        state.spectrumPeakHoldTimer[i] = holdTimer;
      }

      state.smoothedDoa += (state.targetDoa - state.smoothedDoa) * 0.12;
    }

    if (state.activeView === "overview") {
      drawSpectrumOnCanvas(canvasSpectrumOverview, ctxSpectrumOverview, elOverviewSpectrumPeak);
      drawDoaOnCanvas(canvasDoaOverview, ctxDoaOverview, elOverviewDoaReadout);
    } else if (state.activeView === "signals") {
      renderOscilloscope();
      drawSpectrumOnCanvas(canvasSpectrumSignals, ctxSpectrumSignals, elSignalsSpectrumPeak);
      drawDoaOnCanvas(canvasDoaSignals, ctxDoaSignals, elSignalsDoaReadout);
    }

    if (isWindowVisible) {
      animLoopId = requestAnimationFrame(animationLoop);
    }
  }
  startAnimationLoop();

  // ==========================================================================
  // SPARKLINE RENDERING (Pastel Area + Line)
  // ==========================================================================
  function renderSparkline(canvas, history) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = resizeCanvas(canvas, ctx);
    ctx.clearRect(0, 0, width, height);

    if (!history || history.length < 2) return;

    let sliceLen = 30;
    if (state.timeRange === "1m") sliceLen = 60;
    else if (state.timeRange === "5m") sliceLen = 300;
    else if (state.timeRange === "15m") sliceLen = 900;
    const viewHistory = history.slice(-sliceLen);

    const padY = 5;
    const plotH = height - padY * 2;
    const count = viewHistory.length;
    const dx = width / Math.max(1, count - 1);

    // Subtle 70% threshold reference line
    const threshY = padY + plotH * (1.0 - 70 / 100);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.moveTo(0, threshY);
    ctx.lineTo(width, threshY);
    ctx.stroke();
    ctx.setLineDash([]);

    const latestVal = viewHistory[viewHistory.length - 1];
    let strokeColor = "#38A987";
    let fillColor = "rgba(56, 169, 135, 0.18)";
    if (latestVal < 50) {
      strokeColor = "#E56F75";
      fillColor = "rgba(229, 111, 117, 0.22)";
    } else if (latestVal < 70) {
      strokeColor = "#E7A84B";
      fillColor = "rgba(231, 168, 75, 0.18)";
    }

    // Sparkline fill
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < count; i++) {
      const val = Math.max(0, Math.min(100, viewHistory[i]));
      const x = i * dx;
      const y = padY + plotH * (1.0 - val / 100);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Sparkline line
    ctx.beginPath();
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = strokeColor;
    for (let i = 0; i < count; i++) {
      const val = Math.max(0, Math.min(100, viewHistory[i]));
      const x = i * dx;
      const y = padY + plotH * (1.0 - val / 100);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Endpoint dot
    const lastX = (count - 1) * dx;
    const lastY = padY + plotH * (1.0 - Math.max(0, Math.min(100, latestVal)) / 100);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ==========================================================================
  // VIEW 1: OVERVIEW & 4 KPI METRIC CARDS
  // ==========================================================================
  function updateOverviewKpis(machines) {
    const totalCount = machines.length;
    const alarmCount = machines.filter((m) => !m.is_voice && (m.alarm || m.is_abnormal)).length;
    const healthyCount = machines.filter((m) => (!m.alarm || m.is_voice) && m.health >= 70).length;

    let avgHealth = 100;
    if (totalCount > 0) {
      const sum = machines.reduce((acc, m) => acc + (m.health || 0), 0);
      avgHealth = Math.round(sum / totalCount);
    }

    if (elKpiTotalMachines) elKpiTotalMachines.textContent = totalCount;
    if (elKpiHealthyMachines) elKpiHealthyMachines.textContent = healthyCount;
    if (elKpiActiveFaults) elKpiActiveFaults.textContent = alarmCount;
    if (elKpiSystemHealth) elKpiSystemHealth.textContent = `${avgHealth}%`;
    if (elKpiHealthBar) elKpiHealthBar.style.width = `${avgHealth}%`;

    if (elKpiHealthyBadge) {
      elKpiHealthyBadge.textContent = alarmCount > 0 ? "Degraded" : "Nominal";
      elKpiHealthyBadge.className = `kpi-badge ${alarmCount > 0 ? "kpi-badge-coral" : "kpi-badge-mint"}`;
    }
    if (elKpiHealthySub) {
      elKpiHealthySub.textContent = alarmCount > 0 ? `${alarmCount} asset requiring inspection` : "Zero anomalies detected";
    }

    if (elKpiFaultsBadge) {
      elKpiFaultsBadge.textContent = `${alarmCount} Alarm${alarmCount === 1 ? "" : "s"}`;
      elKpiFaultsBadge.className = `kpi-badge ${alarmCount > 0 ? "kpi-badge-coral" : "kpi-badge-blue"}`;
    }
  }

  function renderOverviewCards(machines) {
    if (!elOverviewAssetsGrid) return;

    // Remove orphaned cards (e.g. test_room excluded in Live Mic mode)
    const activeIds = new Set(machines.map((m) => m.id));
    const currentCards = elOverviewAssetsGrid.querySelectorAll(".asset-card");
    currentCards.forEach((c) => {
      const cId = c.id.replace("overview-card-", "");
      if (!activeIds.has(cId)) {
        c.remove();
      }
    });

    machines.forEach((m) => {
      if (!state.machineHistories[m.id]) {
        state.machineHistories[m.id] = new Array(30).fill(m.health);
      } else {
        const hist = state.machineHistories[m.id];
        hist.push(m.health);
        if (hist.length > 900) hist.shift();
      }
    });

    updateOverviewKpis(machines);

    machines.forEach((m) => {
      let card = document.getElementById(`overview-card-${m.id}`);
      const isInitial = !card;

      let healthColorClass = "health-ok";
      let barColor = "#38A987";
      let statusHtml = `<span class="asset-status-pill status-healthy"><span class="status-dot dot-ok"></span> Healthy</span>`;

      const isVoice = m.is_voice || m.fault === "VOICE_IGNORED";
      if (isVoice) {
        healthColorClass = "health-ok";
        barColor = "#38A987";
        statusHtml = `<span class="asset-status-pill status-voice"><span class="status-dot dot-voice"></span> Speech Filtered</span>`;
      } else if (m.alarm) {
        healthColorClass = "health-alarm";
        barColor = "#E56F75";
        statusHtml = `<span class="asset-status-pill status-alarm">Alarm</span>`;
      } else if (m.health < 70) {
        healthColorClass = "health-warn";
        barColor = "#E7A84B";
        statusHtml = `<span class="asset-status-pill status-warning"><span class="status-dot dot-demo"></span> Warning</span>`;
      }

      // 5-dot debouncer
      const hist = m.debouncer_history || [false, false, false, false, false];
      let dotsHtml = "";
      for (let i = 0; i < 5; i++) {
        dotsHtml += `<span class="debouncer-dot ${hist[i] ? "active" : ""}"></span>`;
      }

      const angleStr = `${m.enrolled_angle >= 0 ? "+" : ""}${m.enrolled_angle.toFixed(0)}°`;
      const scoreStr = `${m.score >= 0 ? "+" : ""}${m.score.toFixed(2)}`;
      const threshStr = `${m.threshold >= 0 ? "+" : ""}${Number(m.threshold || 0).toFixed(2)}`;
      const faultLabel = isVoice ? "SPEECH FILTERED" : m.fault;
      const faultColor = isVoice ? "var(--accent-lavender)" : (m.fault === "NORMAL" ? "inherit" : "var(--status-alarm)");

      if (isInitial) {
        card = document.createElement("div");
        card.id = `overview-card-${m.id}`;
        card.className = `asset-card ${m.alarm ? "alarm-state" : ""}`;
        card.title = `Click to open detailed diagnostics for ${m.name}`;
        card.addEventListener("click", () => {
          openMachineDiagnostics(m.id);
        });

        card.innerHTML = `
          <div class="asset-card-row-top">
            <span class="asset-card-title">${m.name}</span>
            <span class="card-status-slot">${statusHtml}</span>
          </div>

          <div class="asset-card-row-health">
            <div class="asset-health-figure ${healthColorClass}">${m.health}%</div>
            <div class="health-progress-track">
              <div class="health-progress-fill" style="width: ${Math.max(0, Math.min(100, m.health))}%; background-color: ${barColor};"></div>
            </div>
          </div>

          <div class="asset-card-row-meta">
            <span class="asset-meta-text">
              Fault: <span class="asset-meta-highlight card-fault-slot" style="color: ${faultColor};">${faultLabel}</span> · Score: <span class="asset-meta-highlight card-score-slot">${scoreStr}</span> <span class="card-thresh-slot" style="color: #8291A5; font-size: 10px;">/ ${threshStr}</span> · Angle: <span class="asset-meta-highlight card-angle-slot">${angleStr}</span>
            </span>
            <div class="debouncer-dots-group" title="3-of-5 Debouncer Sliding Window">
              ${dotsHtml}
            </div>
          </div>

          <div class="asset-sparkline-box">
            <canvas id="sparkline-overview-${m.id}"></canvas>
          </div>
        `;
        elOverviewAssetsGrid.appendChild(card);
      } else {
        // In-place DOM updates: zero node recreation, zero GC churn
        card.className = `asset-card ${m.alarm ? "alarm-state" : ""}`;
        const statusSlot = card.querySelector(".card-status-slot");
        if (statusSlot && statusSlot.innerHTML !== statusHtml) statusSlot.innerHTML = statusHtml;

        const healthFig = card.querySelector(".asset-health-figure");
        if (healthFig) {
          healthFig.className = `asset-health-figure ${healthColorClass}`;
          healthFig.textContent = `${m.health}%`;
        }

        const progFill = card.querySelector(".health-progress-fill");
        if (progFill) {
          progFill.style.width = `${Math.max(0, Math.min(100, m.health))}%`;
          progFill.style.backgroundColor = barColor;
        }

        const faultSlot = card.querySelector(".card-fault-slot");
        if (faultSlot && faultSlot.textContent !== faultLabel) {
          faultSlot.textContent = faultLabel;
          faultSlot.style.color = faultColor;
        }

        const scoreSlot = card.querySelector(".card-score-slot");
        if (scoreSlot && scoreSlot.textContent !== scoreStr) scoreSlot.textContent = scoreStr;

        const threshSlot = card.querySelector(".card-thresh-slot");
        if (threshSlot && threshSlot.textContent !== `/ ${threshStr}`) threshSlot.textContent = `/ ${threshStr}`;

        const angleSlot = card.querySelector(".card-angle-slot");
        if (angleSlot && angleSlot.textContent !== angleStr) angleSlot.textContent = angleStr;

        const dotsGroup = card.querySelector(".debouncer-dots-group");
        if (dotsGroup && dotsGroup.innerHTML !== dotsHtml) dotsGroup.innerHTML = dotsHtml;
      }

      const sparkCanvas = card.querySelector(`#sparkline-overview-${m.id}`);
      if (sparkCanvas) {
        renderSparkline(sparkCanvas, state.machineHistories[m.id]);
      }
    });
  }

  // ==========================================================================
  // VIEW 2: LIVE SIGNAL WORKBENCH METRICS
  // ==========================================================================
  function renderSignalsMetrics(machines) {
    if (!elSignalsMetricsTbody) return;

    // Remove orphaned table rows (e.g. test_room excluded in Live Mic mode)
    const activeIds = new Set(machines.map((m) => m.id));
    const currentRows = elSignalsMetricsTbody.querySelectorAll("tr");
    currentRows.forEach((r) => {
      const rId = r.id.replace("signals-tr-", "");
      if (!activeIds.has(rId)) {
        r.remove();
      }
    });

    if (elSignalsChannelInfo) {
      elSignalsChannelInfo.textContent = `${state.sampleRate / 1000} kHz · ${state.channels} channel${state.channels > 1 ? "s" : ""}`;
    }

    if (elSettingsChannelBadge) {
      elSettingsChannelBadge.textContent = `${state.channels} Channel${state.channels > 1 ? "s (Stereo I2S Mics)" : " (Auto-sensed)"}`;
    }

    machines.forEach((m) => {
      let tr = document.getElementById(`signals-tr-${m.id}`);
      const isInitial = !tr;

      const isVoice = m.is_voice || m.fault === "VOICE_IGNORED" || m.fault === "voice_ignored";
      let statusPill = `<span class="status-pill pill-ok">Healthy</span>`;
      let healthColor = "color: var(--status-ok); font-weight: 600;";
      let faultColor = m.fault === 'NORMAL' ? 'inherit' : 'var(--status-alarm)';
      let faultText = m.fault;

      if (isVoice) {
        statusPill = `<span class="status-pill status-pill-voice">Speech Filtered</span>`;
        healthColor = "color: #9BA3EB; font-weight: 600;";
        faultColor = "#9BA3EB";
        faultText = "VOICE IGNORED";
      } else if (m.alarm) {
        statusPill = `<span class="status-pill pill-alarm">Alarm</span>`;
        healthColor = "color: var(--status-alarm); font-weight: 600;";
      } else if (m.health < 70) {
        statusPill = `<span class="status-pill pill-warn">Warning</span>`;
        healthColor = "color: var(--status-warn); font-weight: 600;";
      }

      const hist = m.debouncer_history || [];
      const activeCount = hist.filter(Boolean).length;

      const inner = `
        <td><strong>${m.name}</strong></td>
        <td class="table-mono" style="${healthColor}">${m.health}%</td>
        <td style="color: ${faultColor}; font-weight: ${m.fault === 'NORMAL' ? '400' : '600'};">${faultText}</td>
        <td class="table-mono">${m.score >= 0 ? "+" : ""}${m.score.toFixed(3)} <span style="color: #8291A5; font-size: 10px;">/ ${m.threshold.toFixed(2)}</span></td>
        <td class="table-mono">${activeCount}/5</td>
        <td>${statusPill}</td>
      `;

      if (isInitial) {
        tr = document.createElement("tr");
        tr.id = `signals-tr-${m.id}`;
        tr.addEventListener("click", () => {
          openMachineDiagnostics(m.id);
        });
        tr.innerHTML = inner;
        elSignalsMetricsTbody.appendChild(tr);
      } else {
        if (tr.innerHTML !== inner) tr.innerHTML = inner;
      }
    });
  }

  // ==========================================================================
  // VIEW 3: MACHINE DIAGNOSTICS (Deep-Dive View)
  // ==========================================================================
  function openMachineDiagnostics(machineId) {
    state.selectedMachineId = machineId;
    switchView("diagnostics");
    updateDiagnosticsView();
  }

  function updateDiagnosticsView() {
    if (state.mode === "live" && state.selectedMachineId === "test_room") {
      state.selectedMachineId = state.machines[0]?.id || "fan_id_00";
    }
    const m = state.machines.find((x) => x.id === state.selectedMachineId) || state.machines[0];
    if (!m) return;

    // Build Machine Selector Tabs
    if (elDiagMachineTabs) {
      elDiagMachineTabs.innerHTML = "";
      state.machines.forEach((mach) => {
        const btn = document.createElement("button");
        btn.className = `machine-tab-btn ${mach.id === m.id ? "active" : ""}`;
        btn.textContent = mach.name;
        btn.type = "button";
        btn.addEventListener("click", () => {
          state.selectedMachineId = mach.id;
          updateDiagnosticsView();
        });
        elDiagMachineTabs.appendChild(btn);
      });
    }

    // Hero Banner
    if (elDiagHeroName) elDiagHeroName.textContent = m.name;
    if (elDiagHeroAngle) elDiagHeroAngle.textContent = `${m.enrolled_angle >= 0 ? "+" : ""}${m.enrolled_angle.toFixed(1)}°`;
    if (elDiagHeroHealth) {
      elDiagHeroHealth.textContent = `${m.health}%`;
      elDiagHeroHealth.style.color = m.health < 50 ? "var(--status-alarm)" : (m.health < 70 ? "var(--status-warn)" : "var(--status-ok)");
    }
    const isVoice = m.is_voice || m.fault === "voice_ignored" || m.fault === "VOICE_IGNORED";
    if (elDiagHeroStatusPill) {
      if (isVoice) {
        elDiagHeroStatusPill.className = "status-pill status-pill-voice";
        elDiagHeroStatusPill.textContent = "Speech Filtered";
      } else {
        elDiagHeroStatusPill.className = `status-pill ${m.alarm ? "pill-alarm" : (m.health < 70 ? "pill-warn" : "pill-ok")}`;
        elDiagHeroStatusPill.textContent = m.alarm ? "Alarm (Debounced)" : (m.health < 70 ? "Warning" : "Healthy");
      }
    }

    // Diagnostic Assessment Explanation
    const fault = (m.demo_fault || m.fault).toLowerCase();
    let expTitle = "Diagnostic Assessment: Normal Operation";
    let expBody = "The acoustic feature vector is within normal baseline tolerances. Energy in rotational harmonics, broadband kurtosis, and high-frequency resonance remains within the 99th percentile threshold.";

    if (isVoice || fault === "voice_ignored") {
      expTitle = "Diagnostic Assessment: Speech / Vocal Rejection Filter Active";
      expBody = "Human vocal tract frequency modulation detected in acoustic band. The intelligent speech filter automatically suppresses false positive alarm detection and physical actuators (Both machines kept safe, buzzer OFF).";
    } else if (fault === "imbalance") {
      expTitle = "Diagnostic Assessment: Rotor Mass Imbalance";
      expBody = "Significant 1x rotational harmonic peak detected at the shaft rotational frequency. Dynamic mass eccentricity causes centrifugal forces proportional to rotational speed squared, requiring rotor balancing.";
    } else if (fault === "misalignment") {
      expTitle = "Diagnostic Assessment: Shaft Angular / Parallel Misalignment";
      expBody = "Elevated 2x and 3x rotational harmonic ratios detected. Coupling kinematic distortion generates cyclic mechanical stress between the motor and load shaft.";
    } else if (fault === "bearing_wear") {
      expTitle = "Diagnostic Assessment: Bearing Raceway Degradation";
      expBody = "Elevated high-frequency acoustic emissions in the 4–12 kHz ultrasonic band accompanied by high kurtosis and crest factor, indicating sub-surface fatigue or spalling on bearing elements.";
    } else if (fault === "cavitation") {
      expTitle = "Diagnostic Assessment: Fluid Cavitation & Turbulence";
      expBody = "Broadband high-frequency acoustic turbulence detected across the mid-to-high spectrum with high spectral flatness, indicating vapor bubble formation and violent collapse in the fluid stream.";
    }

    if (elDiagExplanationTitle) elDiagExplanationTitle.textContent = expTitle;
    if (elDiagExplanationBody) elDiagExplanationBody.textContent = expBody;

    // Anomaly Metrics
    if (elDiagCurrentScore) elDiagCurrentScore.textContent = `${m.score >= 0 ? "+" : ""}${m.score.toFixed(4)}`;
    if (elDiagCurrentThreshold) elDiagCurrentThreshold.textContent = `${m.threshold >= 0 ? "+" : ""}${m.threshold.toFixed(4)}`;
    if (elDiagReadoutThreshold) elDiagReadoutThreshold.textContent = `Threshold: ${m.threshold.toFixed(4)}`;

    const hist = m.debouncer_history || [];
    const activeCount = hist.filter(Boolean).length;
    if (elDiagCurrentDebounce) elDiagCurrentDebounce.textContent = `${activeCount} of 5 active`;
    if (elDiagReadoutBearing) elDiagReadoutBearing.textContent = `Live DOA: ${m.live_doa !== null ? m.live_doa.toFixed(1) + "°" : "--"}`;

    // Feature Status Badges
    const isImbalance = fault === "imbalance";
    const isMisalignment = fault === "misalignment";
    const isBearing = fault === "bearing_wear";
    const isCavitation = fault === "cavitation";

    if (elFeatImbalance) {
      elFeatImbalance.className = `feature-status ${isImbalance ? "status-abnormal" : "status-normal"}`;
      elFeatImbalance.textContent = isImbalance ? "Elevated (+3.8 dB)" : "Normal";
    }
    if (elFeatMisalignment) {
      elFeatMisalignment.className = `feature-status ${isMisalignment ? "status-abnormal" : "status-normal"}`;
      elFeatMisalignment.textContent = isMisalignment ? "Elevated (2x/3x)" : "Normal";
    }
    if (elFeatBearing) {
      elFeatBearing.className = `feature-status ${isBearing ? "status-abnormal" : "status-normal"}`;
      elFeatBearing.textContent = isBearing ? "High Acoustic Hash" : "Normal";
    }
    if (elFeatCavitation) {
      elFeatCavitation.className = `feature-status ${isCavitation ? "status-abnormal" : "status-normal"}`;
      elFeatCavitation.textContent = isCavitation ? "Turbulent Roar" : "Normal";
    }
    if (elFeatAngle) {
      elFeatAngle.textContent = `Enrolled: ${m.enrolled_angle >= 0 ? "+" : ""}${m.enrolled_angle.toFixed(1)}°`;
    }

    // Render Timeline Chart (60-sample sliding health)
    if (canvasDiagTimeline && ctxDiagTimeline) {
      const { width, height } = resizeCanvas(canvasDiagTimeline, ctxDiagTimeline);
      ctxDiagTimeline.clearRect(0, 0, width, height);

      const machHistory = (state.machineHistories[m.id] || []).slice(-60);
      if (machHistory.length > 1) {
        const padY = 10;
        const plotH = height - padY * 2;
        const count = machHistory.length;
        const dx = width / Math.max(1, count - 1);

        // 70% threshold line
        const threshY = padY + plotH * (1.0 - 70 / 100);
        ctxDiagTimeline.beginPath();
        ctxDiagTimeline.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctxDiagTimeline.setLineDash([4, 4]);
        ctxDiagTimeline.lineWidth = 1;
        ctxDiagTimeline.moveTo(0, threshY);
        ctxDiagTimeline.lineTo(width, threshY);
        ctxDiagTimeline.stroke();
        ctxDiagTimeline.setLineDash([]);

        ctxDiagTimeline.font = "10px -apple-system, sans-serif";
        ctxDiagTimeline.fillStyle = "#8291A5";
        ctxDiagTimeline.fillText("70% Health Threshold", 10, threshY - 4);

        // Health line
        ctxDiagTimeline.beginPath();
        ctxDiagTimeline.lineWidth = 2;
        ctxDiagTimeline.strokeStyle = m.health < 50 ? "#E56F75" : (m.health < 70 ? "#E7A84B" : "#38A987");

        for (let i = 0; i < count; i++) {
          const x = i * dx;
          const y = padY + plotH * (1.0 - Math.max(0, Math.min(100, machHistory[i])) / 100);
          if (i === 0) ctxDiagTimeline.moveTo(x, y);
          else ctxDiagTimeline.lineTo(x, y);
        }
        ctxDiagTimeline.stroke();
      }
    }

    // Render Machine DOA Mini Plot
    if (canvasDiagMachineDoa && ctxDiagMachineDoa) {
      drawMiniDoaOnCanvas(canvasDiagMachineDoa, ctxDiagMachineDoa, m.enrolled_angle, m.live_doa);
    }

    // Filter historical alarms for this specific machine
    if (elDiagEventsTbody) {
      const machEvents = state.events.filter((ev) => ev.machine === m.id || ev.machine === m.name);
      if (machEvents.length === 0) {
        elDiagEventsTbody.innerHTML = `
          <tr class="table-empty-row">
            <td colspan="6">No historical alarms recorded for this machine</td>
          </tr>
        `;
      } else {
        const frag = document.createDocumentFragment();
        machEvents.slice(0, 10).forEach((ev) => {
          const tr = document.createElement("tr");
          tr.addEventListener("click", () => openEventDetail(ev));
          tr.innerHTML = `
            <td class="table-mono">${formatTimestamp(ev.timestamp)}</td>
            <td class="table-mono" style="color: ${ev.health < 50 ? '#E56F75' : '#E7A84B'}; font-weight: 600;">${ev.health}%</td>
            <td style="color: var(--status-alarm); font-weight: 600;">${ev.fault}</td>
            <td class="table-mono">${ev.score >= 0 ? "+" : ""}${Number(ev.score).toFixed(3)}</td>
            <td class="table-mono">${ev.angle_deg !== null ? Number(ev.angle_deg).toFixed(0) + "°" : "--"}</td>
            <td><span class="status-pill pill-alarm">Alarm</span></td>
          `;
          frag.appendChild(tr);
        });
        elDiagEventsTbody.innerHTML = "";
        elDiagEventsTbody.appendChild(frag);
      }
    }
  }

  // ==========================================================================
  // VIEW 4: EVENT LOG (Search, Filter, Sort, Detail Modal, CSV Export)
  // ==========================================================================
  function updateFilterOptions(machines) {
    if (!elEventMachineFilter) return;
    const currentVal = elEventMachineFilter.value;
    const existing = Array.from(elEventMachineFilter.options).map((o) => o.value);
    const newOpts = ["all", ...machines.map((m) => m.id)];

    if (JSON.stringify(existing) !== JSON.stringify(newOpts)) {
      elEventMachineFilter.innerHTML = `<option value="all">All Assets</option>`;
      machines.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        elEventMachineFilter.appendChild(opt);
      });
      elEventMachineFilter.value = currentVal || "all";
    }
  }

  let lastEventsFingerprint = "";

  elEventSearchInput?.addEventListener("input", (e) => {
    state.eventSearchQuery = e.target.value.toLowerCase().trim();
    lastEventsFingerprint = "";
    renderEventsTable();
  });

  elEventMachineFilter?.addEventListener("change", (e) => {
    state.eventFilterMachine = e.target.value;
    lastEventsFingerprint = "";
    renderEventsTable();
  });

  elEventFaultFilter?.addEventListener("change", (e) => {
    state.eventFilterFault = e.target.value;
    lastEventsFingerprint = "";
    renderEventsTable();
  });

  elEventSortSelect?.addEventListener("change", (e) => {
    state.eventSortBy = e.target.value;
    lastEventsFingerprint = "";
    renderEventsTable();
  });

  function getFilteredEvents() {
    let result = [...state.events];

    if (state.eventSearchQuery) {
      const q = state.eventSearchQuery;
      result = result.filter(
        (ev) =>
          ev.machine.toLowerCase().includes(q) ||
          ev.fault.toLowerCase().includes(q) ||
          String(ev.timestamp).toLowerCase().includes(q) ||
          String(ev.id).includes(q)
      );
    }

    if (state.eventFilterMachine !== "all") {
      result = result.filter((ev) => ev.machine === state.eventFilterMachine);
    }

    if (state.eventFilterFault !== "all") {
      result = result.filter((ev) => ev.fault.toUpperCase() === state.eventFilterFault);
    }

    result.sort((a, b) => {
      if (state.eventSortBy === "time-asc") return a.id - b.id;
      if (state.eventSortBy === "score-desc") return b.score - a.score;
      if (state.eventSortBy === "health-asc") return a.health - b.health;
      return b.id - a.id;
    });

    return result;
  }

  function renderEventsTable() {
    if (!elEventsTbody) return;

    const filtered = getFilteredEvents();

    if (filtered.length === 0) {
      elEventsTbody.innerHTML = `
        <tr class="table-empty-row">
          <td colspan="8">No matching alarm events found</td>
        </tr>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const ev of filtered) {
      const tr = document.createElement("tr");
      const isNew = state.hasPolledOnce && !state.knownEventIds.has(ev.id);
      if (isNew) tr.classList.add("row-new");
      state.knownEventIds.add(ev.id);

      tr.addEventListener("click", () => {
        openEventDetail(ev);
      });

      const isVoice = ev.fault === "VOICE_IGNORED" || ev.fault === "voice_ignored";
      let healthColor = isVoice ? "#9BA3EB" : "#38A987";
      if (!isVoice) {
        if (ev.health < 50) healthColor = "#E56F75";
        else if (ev.health < 70) healthColor = "#E7A84B";
      }

      const angleStr = ev.angle_deg !== null ? `${ev.angle_deg >= 0 ? "+" : ""}${Number(ev.angle_deg).toFixed(0)}°` : "--";
      const scoreStr = `${ev.score >= 0 ? "+" : ""}${Number(ev.score).toFixed(3)}`;
      const faultLabel = isVoice
        ? '<span style="color: #9BA3EB; font-weight: 600;">VOICE IGNORED</span>'
        : `<span style="color: var(--status-alarm); font-weight: 600;">${ev.fault}</span>`;
      const statusPill = isVoice
        ? '<span class="status-pill status-pill-voice">Filtered</span>'
        : '<span class="status-pill pill-alarm">Alarm</span>';

      tr.innerHTML = `
        <td class="table-mono">${formatTimestamp(ev.timestamp)}</td>
        <td><strong>${ev.machine}</strong></td>
        <td class="table-mono" style="color: ${healthColor}; font-weight: 600;">${ev.health}%</td>
        <td>${faultLabel}</td>
        <td class="table-mono">${scoreStr}</td>
        <td class="table-mono">${angleStr}</td>
        <td>${statusPill}</td>
        <td><button class="btn-table-action" type="button">Inspect</button></td>
      `;

      fragment.appendChild(tr);
    }

    elEventsTbody.innerHTML = "";
    elEventsTbody.appendChild(fragment);
  }

  function formatTimestamp(ts) {
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toISOString().replace("T", " ").substring(0, 19);
      }
    } catch (e) {}
    return ts;
  }

  // ==========================================================================
  // EVENT DETAIL MODAL
  // ==========================================================================
  function openEventDetail(ev) {
    if (!elModalEventDetail) return;

    if (elDetailEventId) elDetailEventId.textContent = `Event #${ev.id}`;
    if (elDetailMachine) elDetailMachine.textContent = ev.machine;
    if (elDetailTimestamp) elDetailTimestamp.textContent = formatTimestamp(ev.timestamp);
    if (elDetailHealth) {
      elDetailHealth.textContent = `${ev.health}%`;
      elDetailHealth.style.color = ev.health < 50 ? "#E56F75" : "#E7A84B";
    }
    if (elDetailFault) elDetailFault.textContent = ev.fault;
    if (elDetailScore) elDetailScore.textContent = `${ev.score >= 0 ? "+" : ""}${Number(ev.score).toFixed(4)}`;
    if (elDetailBearing) elDetailBearing.textContent = ev.angle_deg !== null ? `${Number(ev.angle_deg).toFixed(1)}°` : "N/A";

    let explanation = `The asset '${ev.machine}' exceeded anomaly threshold with LOF score of ${Number(ev.score).toFixed(4)}, driving health to ${ev.health}%.`;
    if (ev.fault.toUpperCase().includes("VOICE")) {
      explanation = `Human vocal tract frequencies detected on asset '${ev.machine}'. Acoustic speech filter rejected the signal to prevent false alarm trips (both machines kept in safe nominal state, buzzer silent).`;
    } else if (ev.fault.toUpperCase().includes("IMBALANCE")) {
      explanation += " Spectral evidence: high 1x rotational harmonic energy indicates mass unbalance on the rotating axis.";
    } else if (ev.fault.toUpperCase().includes("MISALIGNMENT")) {
      explanation += " Spectral evidence: significant 2x and 3x harmonic rise indicates parallel or angular shaft misalignment.";
    } else if (ev.fault.toUpperCase().includes("BEARING")) {
      explanation += " Spectral evidence: high-frequency ultrasonic acoustic emissions (4–12 kHz) indicate rolling element or raceway spalling.";
    } else if (ev.fault.toUpperCase().includes("CAVITATION")) {
      explanation += " Spectral evidence: high spectral flatness and broadband energy indicate fluid cavitation turbulence.";
    }
    if (elDetailExpText) elDetailExpText.textContent = explanation;

    elModalEventDetail.classList.remove("hidden");
  }

  elBtnCloseEventDetail?.addEventListener("click", () => elModalEventDetail.classList.add("hidden"));
  elBtnDetailDone?.addEventListener("click", () => elModalEventDetail.classList.add("hidden"));
  elModalEventDetail?.addEventListener("click", (e) => {
    if (e.target === elModalEventDetail) elModalEventDetail.classList.add("hidden");
  });

  // ==========================================================================
  // CSV EXPORT UTILITY
  // ==========================================================================
  elBtnExportCsv?.addEventListener("click", () => {
    const filtered = getFilteredEvents();
    if (filtered.length === 0) {
      alert("No events match the current filter to export.");
      return;
    }

    const headers = ["Event_ID", "Timestamp", "Machine", "Health_Pct", "Fault_Type", "LOF_Score", "Bearing_Deg", "Status"];
    const rows = filtered.map((ev) => [
      ev.id,
      `"${ev.timestamp}"`,
      `"${ev.machine}"`,
      ev.health,
      `"${ev.fault}"`,
      Number(ev.score).toFixed(4),
      ev.angle_deg !== null ? Number(ev.angle_deg).toFixed(1) : "",
      ev.alarm ? "ALARM" : "OK",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `machine_whisperer_events_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ==========================================================================
  // CLEAR LOG CONFIRMATION MODAL
  // ==========================================================================
  elBtnClearEventsModal?.addEventListener("click", () => {
    elModalClearConfirm?.classList.remove("hidden");
  });

  elBtnCloseClearModal?.addEventListener("click", () => elModalClearConfirm?.classList.add("hidden"));
  elBtnCancelClear?.addEventListener("click", () => elModalClearConfirm?.classList.add("hidden"));
  elModalClearConfirm?.addEventListener("click", (e) => {
    if (e.target === elModalClearConfirm) elModalClearConfirm?.classList.add("hidden");
  });

  elBtnConfirmClear?.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/events/clear", { method: "POST" });
      if (res.ok) {
        state.knownEventIds.clear();
        state.events = [];
        await pollEvents();
        elModalClearConfirm?.classList.add("hidden");
        if (state.activeView === "diagnostics") updateDiagnosticsView();
      }
    } catch (err) {
      console.error("[Clear Events Error]", err);
    }
  });

  // Keyboard accessibility: Escape closes open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      elModalEventDetail?.classList.add("hidden");
      elModalClearConfirm?.classList.add("hidden");
      elDemoPopoverMenu?.classList.add("hidden");
    }
  });

  // ==========================================================================
  // API POLLING & SERVER ACTIONS
  // ==========================================================================
  async function pollStatus() {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      state.mode = data.mode || "demo";
      state.channels = data.channels || 1;
      state.sampleRate = data.sample_rate || 16000;
      state.machines = data.machines || [];
      state.systemAlarmActive = state.machines.some((m) => m.alarm);

      // Mode & Footer Status
      if (state.mode === "live") {
        elBtnLive?.classList.add("active");
        elBtnDemo?.classList.remove("active");
        if (elSidebarStatusDot) elSidebarStatusDot.className = state.systemAlarmActive ? "status-dot dot-alarm" : "status-dot dot-ok";
        if (elSidebarStatusText) elSidebarStatusText.textContent = `Live · ${state.sampleRate / 1000} kHz · ${state.channels}ch`;
        if (elDemoDropdownContainer) elDemoDropdownContainer.style.display = "none";
      } else {
        elBtnDemo?.classList.add("active");
        elBtnLive?.classList.remove("active");
        if (elSidebarStatusDot) elSidebarStatusDot.className = state.systemAlarmActive ? "status-dot dot-alarm" : "status-dot dot-demo";
        if (elSidebarStatusText) elSidebarStatusText.textContent = `Demo Mode · ${state.sampleRate / 1000} kHz`;
        if (elDemoDropdownContainer) elDemoDropdownContainer.style.display = "block";
      }

      // Spectrum Target
      if (!state.isSignalPaused && Array.isArray(data.spectrum) && data.spectrum.length === 32) {
        for (let i = 0; i < 32; i++) {
          state.spectrumTarget[i] = data.spectrum[i];
        }
      }

      // DOA Target
      if (!state.isSignalPaused && data.live_doa !== null && data.live_doa !== undefined) {
        state.targetDoa = data.live_doa;
      }

      renderOverviewCards(state.machines);
      renderSignalsMetrics(state.machines);
      updatePopoverMachines(state.machines);
      updateFilterOptions(state.machines);
      updateCalibrateMachines(state.machines);

      if (data.hardware) {
        updateHardwareStatus(data.hardware);
      }

      if (state.activeView === "diagnostics") {
        updateDiagnosticsView();
      }

      dismissLoadingScreen();
    } catch (err) {
      console.warn("[Poll Status]", err);
    }
  }

  // ==========================================================================
  // HARDWARE STATUS (RPi 4 Dual-Machine GPIO Actuators & Fallback)
  // ==========================================================================
  function updateHardwareStatus(hw) {
    if (!hw) return;

    if (elHwPlatformTag) {
      elHwPlatformTag.textContent = hw.is_real_gpio ? "Pi 4 (GPIO)" : "Safe Mock";
      elHwPlatformTag.className = `hw-platform-tag ${hw.is_real_gpio ? "hw-tag-real" : ""}`;
    }

    // Machine 1 Indicator (Left / Mic 0)
    if (elPinPillM1 && hw.machine_1) {
      const isM1Fault = hw.machine_1.indicator === "RED";
      elPinPillM1.className = `hw-pin-pill ${isM1Fault ? "pin-pill-red" : "pin-pill-green"} active`;
      if (elPinDotM1) elPinDotM1.className = `hw-pin-dot ${isM1Fault ? "dot-alarm" : "dot-ok"}`;
      if (elPinNameM1) elPinNameM1.textContent = `M1 (Mic 0): ${isM1Fault ? "FLT" : "OK"}`;
    }
    if (elSettingsM1State && hw.machine_1) {
      const isM1Fault = hw.machine_1.indicator === "RED";
      elSettingsM1State.textContent = `M1 (Mic 0) · ${isM1Fault ? "RED (FAULT)" : "GREEN (OK)"}`;
      elSettingsM1State.className = `settings-badge ${isM1Fault ? "pin-red" : "pin-green"}`;
    }

    // Machine 2 Indicator (Right / Mic 1)
    if (elPinPillM2 && hw.machine_2) {
      const isM2Fault = hw.machine_2.indicator === "RED";
      elPinPillM2.className = `hw-pin-pill ${isM2Fault ? "pin-pill-red" : "pin-pill-green"} active`;
      if (elPinDotM2) elPinDotM2.className = `hw-pin-dot ${isM2Fault ? "dot-alarm" : "dot-ok"}`;
      if (elPinNameM2) elPinNameM2.textContent = `M2 (Mic 1): ${isM2Fault ? "FLT" : "OK"}`;
    }
    if (elSettingsM2State && hw.machine_2) {
      const isM2Fault = hw.machine_2.indicator === "RED";
      elSettingsM2State.textContent = `M2 (Mic 1) · ${isM2Fault ? "RED (FAULT)" : "GREEN (OK)"}`;
      elSettingsM2State.className = `settings-badge ${isM2Fault ? "pin-red" : "pin-green"}`;
    }

    // Active-Low Buzzer Status
    if (elPinPillBuzzer && hw.buzzer) {
      elPinPillBuzzer.classList.toggle("active", !!hw.buzzer.state);
    }
    if (elSettingsBuzzerState && hw.buzzer) {
      elSettingsBuzzerState.textContent = `GPIO BCM 22 · ${hw.buzzer.state ? "ACTIVE (ALARM)" : "OFF (SILENT)"}`;
      elSettingsBuzzerState.className = `settings-badge ${hw.buzzer.state ? "pin-coral" : ""}`;
    }

    // Platform Badge
    if (elSettingsHwPlatform) {
      elSettingsHwPlatform.textContent = hw.platform || (hw.is_real_gpio ? "Raspberry Pi 4 (Real GPIO)" : "Windows / Safe Fallback");
    }
  }

  // ==========================================================================
  // AUDIO FILE TESTING & THRESHOLD CALIBRATION
  // ==========================================================================
  function updateCalibrateMachines(machines) {
    if (!elCalibrateMachineSelect) return;
    const currentVal = elCalibrateMachineSelect.value;
    const existing = Array.from(elCalibrateMachineSelect.options).map((o) => o.value);
    const newOpts = machines.map((m) => m.id);

    if (JSON.stringify(existing) !== JSON.stringify(newOpts)) {
      elCalibrateMachineSelect.innerHTML = "";
      machines.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.name} (thresh: ${m.threshold.toFixed(3)})`;
        elCalibrateMachineSelect.appendChild(opt);
      });
      elCalibrateMachineSelect.value = currentVal || (machines[0]?.id || "");
      const selectedMach = machines.find((m) => m.id === elCalibrateMachineSelect.value);
      if (selectedMach && elInputCalibrateThreshold && !elInputCalibrateThreshold.value) {
        elInputCalibrateThreshold.value = selectedMach.threshold.toFixed(4);
      }
    }
  }

  elCalibrateMachineSelect?.addEventListener("change", () => {
    const mach = state.machines.find((m) => m.id === elCalibrateMachineSelect.value);
    if (mach && elInputCalibrateThreshold) {
      elInputCalibrateThreshold.value = mach.threshold.toFixed(4);
    }
  });

  // Load available audio files list from server
  async function loadAudioFilesList() {
    try {
      const res = await fetch("/api/audio/files");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files) && data.files.length > 0 && elAudioFileSelect) {
          elAudioFileSelect.innerHTML = "";
          
          const groups = {
            synthetic_broken: document.createElement("optgroup"),
            extreme_damaged: document.createElement("optgroup"),
            speech: document.createElement("optgroup"),
            raw_sample: document.createElement("optgroup"),
          };
          groups.synthetic_broken.label = "⚡ Synthetic Broken WAVs";
          groups.extreme_damaged.label = "🔥 Extreme Damaged WAVs";
          groups.speech.label = "🗣️ Speech / Voice Rejection";
          groups.raw_sample.label = "📊 Benchmark Raw Samples";

          data.files.forEach((f) => {
            const opt = document.createElement("option");
            opt.value = f.path;
            const fName = f.name || f.filename;
            opt.textContent = `${fName} (${f.size_kb ? f.size_kb + " KB" : ""})`;
            const cat = f.category || (f.is_speech ? "speech" : "raw_sample");
            if (groups[cat]) {
              groups[cat].appendChild(opt);
            } else {
              groups.raw_sample.appendChild(opt);
            }
          });

          Object.values(groups).forEach((grp) => {
            if (grp.children.length > 0) elAudioFileSelect.appendChild(grp);
          });
        }
      }
    } catch (e) {
      // Keep static defaults
    }
  }
  loadAudioFilesList();

  // Helper for direct file test execution
  async function runDirectFileTest(filePath, micTarget) {
    if (elBtnRunFileTest) {
      elBtnRunFileTest.disabled = true;
      elBtnRunFileTest.textContent = "Analyzing...";
    }

    try {
      const res = await fetch("/api/audio/test-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath, mic: parseInt(micTarget, 10) }),
      });
      const data = await res.json();
      if (res.ok) {
        if (elTestAudioResultRow) elTestAudioResultRow.style.display = "flex";
        if (elTestFileResultDesc) {
          const micLabel = data.target_mic === 0 ? "Mic 0 (Machine 1 / Left)" : "Mic 1 (Machine 2 / Right)";
          elTestFileResultDesc.textContent = `${micLabel} · ${data.machine} · Health: ${data.health}% · Score: ${data.score >= 0 ? "+" : ""}${data.score.toFixed(4)} · Voice Ignored: ${data.is_voice}`;
        }
        if (elTestFileResultBadge) {
          elTestFileResultBadge.textContent = data.fault.toUpperCase();
          if (data.is_voice) {
            elTestFileResultBadge.className = "settings-badge status-pill-voice";
          } else if (data.is_abnormal) {
            elTestFileResultBadge.className = "settings-badge pin-red";
          } else {
            elTestFileResultBadge.className = "settings-badge pin-green";
          }
        }
        await pollStatus();
        await pollEvents();
      } else {
        alert(data.error || "Failed to analyze audio file.");
      }
    } catch (err) {
      console.error("[Test File Error]", err);
      alert("Error executing audio diagnostics test.");
    } finally {
      if (elBtnRunFileTest) {
        elBtnRunFileTest.disabled = false;
        elBtnRunFileTest.textContent = "Run Test";
      }
    }
  }

  // Run File Test Click Handler
  elBtnRunFileTest?.addEventListener("click", async () => {
    if (!elAudioFileSelect) return;
    const filePath = elAudioFileSelect.value;
    const micVal = document.getElementById("audio-test-mic")?.value || "0";
    await runDirectFileTest(filePath, micVal);
  });

  // Quick Demo Injections Handlers
  document.getElementById("btn-quick-synthetic-m0")?.addEventListener("click", async () => {
    await runDirectFileTest("synthetic_broken_wavs/synthetic_bearing_fault_mic0.wav", 0);
  });
  document.getElementById("btn-quick-extreme-m1")?.addEventListener("click", async () => {
    await runDirectFileTest("extreme_damaged_wavs/extreme_impeller_cavitation_mic1.wav", 1);
  });
  document.getElementById("btn-quick-voice-filter")?.addEventListener("click", async () => {
    await runDirectFileTest("data/raw/test.wav", 0);
  });
  document.getElementById("btn-quick-reset-normal")?.addEventListener("click", async () => {
    try {
      await fetch("/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (elTestAudioResultRow) elTestAudioResultRow.style.display = "none";
      await pollStatus();
      await pollEvents();
    } catch (e) {
      console.error("[Reset Error]", e);
    }
  });

  // Save Threshold
  elBtnSaveThreshold?.addEventListener("click", async () => {
    const machineId = elCalibrateMachineSelect?.value;
    const threshVal = parseFloat(elInputCalibrateThreshold?.value);
    if (!machineId || isNaN(threshVal)) {
      alert("Please select a machine and enter a valid numeric threshold.");
      return;
    }

    try {
      const res = await fetch("/api/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machine: machineId, threshold: threshVal }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Baseline threshold for '${data.machine}' updated to ${data.threshold.toFixed(4)}.`);
        await pollStatus();
      } else {
        alert(data.error || "Failed to update threshold.");
      }
    } catch (err) {
      console.error("[Save Threshold Error]", err);
    }
  });

  // Auto-Calibrate Threshold
  elBtnAutoCalibrate?.addEventListener("click", async () => {
    const machineId = elCalibrateMachineSelect?.value;
    if (!machineId) return;

    const origText = elBtnAutoCalibrate.textContent;
    elBtnAutoCalibrate.disabled = true;
    elBtnAutoCalibrate.textContent = "Calibrating...";

    try {
      const res = await fetch("/api/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machine: machineId, auto: true }),
      });
      const data = await res.json();
      if (res.ok) {
        if (elInputCalibrateThreshold) {
          elInputCalibrateThreshold.value = data.threshold.toFixed(4);
        }
        alert(`Auto-calibrated threshold for '${data.machine}': ${data.threshold.toFixed(4)}.`);
        await pollStatus();
      } else {
        alert(data.error || "Auto-calibration failed.");
      }
    } catch (err) {
      console.error("[Auto-Calibrate Error]", err);
    } finally {
      elBtnAutoCalibrate.disabled = false;
      elBtnAutoCalibrate.textContent = origText;
    }
  });

  async function pollEvents() {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = await res.json();
      state.events = events;

      // Smart change detection: only rebuild the table DOM if events or query changed
      const fp = `${events.length}_${events[0]?.id || 0}_${state.eventSearchQuery}_${state.eventFilterMachine}_${state.eventFilterFault}_${state.eventSortBy}`;
      if (fp !== lastEventsFingerprint) {
        lastEventsFingerprint = fp;
        renderEventsTable();
      }

      state.hasPolledOnce = true;
      if (state.activeView === "diagnostics") updateDiagnosticsView();
    } catch (err) {
      console.warn("[Poll Events]", err);
    }
  }

  async function switchMode(targetMode) {
    try {
      const res = await fetch("/api/mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: targetMode }),
      });
      if (res.ok) {
        await pollStatus();
      }
    } catch (err) {
      console.error("[Switch Mode Error]", err);
    }
  }

  async function injectFault(machineId, fault) {
    try {
      const res = await fetch("/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machine: machineId, fault }),
      });
      if (res.ok) {
        await pollStatus();
      }
    } catch (err) {
      console.error("[Inject Fault Error]", err);
    }
  }

  // Mode button events
  elBtnLive?.addEventListener("click", () => switchMode("live"));
  elBtnDemo?.addEventListener("click", () => switchMode("demo"));

  // Initial polls & 1.0s interval
  pollStatus();
  pollEvents();
  setInterval(() => {
    pollStatus();
    pollEvents();
  }, 1000);
})();
