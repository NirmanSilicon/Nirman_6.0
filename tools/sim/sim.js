/**
 * SAARTHI — Evaluation Simulator & 3D FMCW Simulation Engine
 * Zero external dependencies, paper-and-ink Canvas 2D rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
  const PALETTE = {
    paper: '#f6f4ee',
    surface: '#fbfaf6',
    paperSurface: '#efeadd',
    ink: '#1f2a30',
    inkSoft: '#434f56',
    faint: '#6f787e',
    rule: '#c9cdc8',
    said: '#1a7f4b',
    unsure: '#b27800',
    lost: '#b3261e',
    belief: '#2c5d8a',
  };

  // =========================================================================
  // 1. Navigation & Presentation Timer (5:00 Round 2 Target)
  // =========================================================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const modules = document.querySelectorAll('.module-container');
  let currentTabIndex = 0;

  function switchTab(tabId) {
    navTabs.forEach((tab, idx) => {
      const isMatch = tab.dataset.tab === tabId;
      tab.classList.toggle('active', isMatch);
      if (isMatch) currentTabIndex = idx;
    });

    modules.forEach((mod) => {
      mod.classList.toggle('active', mod.id === tabId);
    });

    if (tabId === 'module-3') renderTable();
    if (tabId === 'module-6') {
      renderFmcwScene();
      renderFmcwSpectrum();
    }
  }

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key >= '1' && e.key <= '6') {
      const tab = navTabs[parseInt(e.key, 10) - 1];
      if (tab) switchTab(tab.dataset.tab);
    } else if (e.key === 'ArrowRight' && currentTabIndex < navTabs.length - 1) {
      switchTab(navTabs[currentTabIndex + 1].dataset.tab);
    } else if (e.key === 'ArrowLeft' && currentTabIndex > 0) {
      switchTab(navTabs[currentTabIndex - 1].dataset.tab);
    }
  });

  const timerBadge = document.getElementById('presentationTimer');
  const btnTimerToggle = document.getElementById('btnTimerToggle');
  const btnTimerReset = document.getElementById('btnTimerReset');
  let timerInterval = null;
  let elapsedSeconds = 0;

  function updateTimerDisplay() {
    const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
    timerBadge.textContent = `${mins}:${secs} / 05:00`;
    if (elapsedSeconds > 300 && elapsedSeconds <= 345) {
      timerBadge.style.color = PALETTE.unsure;
    } else if (elapsedSeconds > 345) {
      timerBadge.style.color = PALETTE.lost;
    } else {
      timerBadge.style.color = PALETTE.ink;
    }
  }

  btnTimerToggle.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      btnTimerToggle.textContent = 'Resume Pitch';
    } else {
      timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
      }, 1000);
      btnTimerToggle.textContent = 'Pause Pitch';
    }
  });

  btnTimerReset.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    elapsedSeconds = 0;
    updateTimerDisplay();
    btnTimerToggle.textContent = 'Start Pitch';
  });

  // =========================================================================
  // 2. Module 3: Two-Map Sally-Anne Simulation (Paper & Ink Canvas)
  // =========================================================================
  const canvas = document.getElementById('tableCanvas');
  const ctx = canvas.getContext('2d');
  const speechBadge = document.getElementById('speechBadge');
  const divergenceBadge = document.getElementById('divergenceStatusBadge');
  const ledgerInfo = document.getElementById('ledgerInfo');

  const btnMoveBottle = document.getElementById('btnMoveBottle');
  const btnReachOldSpot = document.getElementById('btnReachOldSpot');
  const btnReachNewSpot = document.getElementById('btnReachNewSpot');
  const btnResetTable = document.getElementById('btnResetTable');

  const origin = { x: 400, y: 440 };
  let activeAnim = null;

  const tableObjects = [
    {
      id: 'bottle',
      name: 'Water Bottle',
      color: PALETTE.belief,
      world: { x: 550, y: 255 },
      belief: { x: 550, y: 255 },
      radius: 17,
    },
    {
      id: 'mug',
      name: 'Coffee Mug',
      color: PALETTE.unsure,
      world: { x: 480, y: 325 },
      belief: { x: 480, y: 325 },
      radius: 15,
    },
    {
      id: 'laptop',
      name: 'Laptop (Anchor)',
      color: PALETTE.inkSoft,
      world: { x: 400, y: 205 },
      belief: { x: 400, y: 205 },
      width: 104,
      height: 58,
    },
  ];

  const hand = { x: 400, y: 410, freeze: false };

  function updateLedger() {
    const bottle = tableObjects.find((o) => o.id === 'bottle');
    const dist = Math.hypot(bottle.world.x - bottle.belief.x, bottle.world.y - bottle.belief.y);
    const diverged = dist > 35;

    let html = '<div><strong>Bottle:</strong> ';
    if (diverged) {
      html += `World (left of laptop) vs Belief (right) <span style="color: ${PALETTE.lost}; font-weight:700;">[MOVED]</span></div>`;
      divergenceBadge.textContent = 'State: Divergence Detected (World != Belief)';
      divergenceBadge.style.color = PALETTE.lost;
      divergenceBadge.style.borderColor = PALETTE.lost;
    } else {
      html += 'World == Belief (on your right)</div>';
      divergenceBadge.textContent = 'State: Synchronized (Beliefs Agree)';
      divergenceBadge.style.color = PALETTE.said;
      divergenceBadge.style.borderColor = PALETTE.said;
    }
    html += '<div><strong>Cup:</strong> slightly right · Beliefs Agree</div>';
    html += '<div><strong>Laptop:</strong> in front of you · Landmark</div>';
    ledgerInfo.innerHTML = html;
  }

  function setSpeechState(mode, text = '') {
    if (mode === 'alert') {
      speechBadge.className = 'speech-dialogue-badge alert';
      speechBadge.innerHTML = `&ldquo;${text}&rdquo;<span style="font-size:11px; color:${PALETTE.inkSoft}; margin-top:3px; display:block;">Spoken once: World diverged from Belief.</span>`;
    } else if (mode === 'said') {
      speechBadge.className = 'speech-dialogue-badge said-ok';
      speechBadge.innerHTML = `&ldquo;${text}&rdquo;<span style="font-size:11px; color:${PALETTE.inkSoft}; margin-top:3px; display:block;">Target reached — Belief synced with World.</span>`;
    } else {
      speechBadge.className = 'speech-dialogue-badge silent';
      speechBadge.innerHTML = `[PROACTIVELY SILENT]<span style="font-size:11px; color:${PALETTE.faint}; margin-top:3px; display:block;">Reality matches user belief. Zero audio clutter.</span>`;
    }
  }

  function renderTable() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = PALETTE.surface;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper gridlines
    ctx.strokeStyle = 'rgba(201, 205, 200, 0.45)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Reach Arcs
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 225, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(26, 127, 75, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 335, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(178, 120, 0, 0.4)';
    ctx.stroke();
    ctx.setLineDash([]);

    // Plain D24 direction rays
    const rays = [
      { label: 'Left', a: (5 * Math.PI) / 6 },
      { label: 'Slight L', a: (4 * Math.PI) / 6 },
      { label: 'In Front', a: Math.PI / 2 },
      { label: 'Slight R', a: Math.PI / 3 },
      { label: 'Right', a: Math.PI / 6 },
    ];
    ctx.strokeStyle = 'rgba(31, 42, 48, 0.12)';
    ctx.fillStyle = PALETTE.faint;
    ctx.font = '600 10.5px Consolas, monospace';
    rays.forEach((r) => {
      const rx = origin.x - 365 * Math.cos(r.a);
      const ry = origin.y - 365 * Math.sin(r.a);
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.fillText(r.label, origin.x - 385 * Math.cos(r.a) - 22, origin.y - 385 * Math.sin(r.a) + 4);
    });

    // User chest marker
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = PALETTE.paper;
    ctx.font = 'bold 9.5px Consolas, monospace';
    ctx.fillText('YOU', origin.x - 10, origin.y + 3);

    // Table Objects + Belief Ghosts + Divergence Tether
    tableObjects.forEach((obj) => {
      if (obj.width) {
        ctx.fillStyle = PALETTE.paperSurface;
        ctx.fillRect(obj.world.x - obj.width / 2, obj.world.y - obj.height / 2, obj.width, obj.height);
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obj.world.x - obj.width / 2, obj.world.y - obj.height / 2, obj.width, obj.height);
        ctx.fillStyle = PALETTE.ink;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText(obj.name, obj.world.x - 42, obj.world.y + 4);
      } else {
        const dist = Math.hypot(obj.world.x - obj.belief.x, obj.world.y - obj.belief.y);
        if (dist > 30) {
          // Red divergence tether
          ctx.beginPath();
          ctx.moveTo(obj.belief.x, obj.belief.y);
          ctx.lineTo(obj.world.x, obj.world.y);
          ctx.strokeStyle = PALETTE.lost;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Midpoint MOVED pill
          const mx = (obj.belief.x + obj.world.x) / 2;
          const my = (obj.belief.y + obj.world.y) / 2;
          ctx.fillStyle = PALETTE.surface;
          ctx.fillRect(mx - 24, my - 9, 48, 16);
          ctx.strokeStyle = PALETTE.lost;
          ctx.lineWidth = 1;
          ctx.strokeRect(mx - 24, my - 9, 48, 16);
          ctx.fillStyle = PALETTE.lost;
          ctx.font = 'bold 9.5px Consolas, monospace';
          ctx.fillText('MOVED', mx - 16, my + 2);

          // Belief ghost circle
          ctx.beginPath();
          ctx.arc(obj.belief.x, obj.belief.y, obj.radius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(44, 93, 138, 0.12)';
          ctx.fill();
          ctx.strokeStyle = PALETTE.belief;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = PALETTE.belief;
          ctx.font = '600 10.5px Consolas, monospace';
          ctx.fillText(`Believed ${obj.name}`, obj.belief.x - 48, obj.belief.y - obj.radius - 7);
        }

        // Physical World Object
        ctx.beginPath();
        ctx.arc(obj.world.x, obj.world.y, obj.radius, 0, 2 * Math.PI);
        ctx.fillStyle = obj.color;
        ctx.fill();
        ctx.strokeStyle = PALETTE.ink;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = PALETTE.ink;
        ctx.font = '600 11.5px Inter, sans-serif';
        ctx.fillText(obj.name, obj.world.x - 32, obj.world.y + obj.radius + 15);
      }
    });

    // Virtual Hand & Raycast
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -42);
    ctx.strokeStyle = hand.freeze ? PALETTE.lost : PALETTE.said;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, 2 * Math.PI);
    ctx.fillStyle = hand.freeze ? PALETTE.lost : PALETTE.said;
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (hand.freeze) {
      ctx.fillStyle = PALETTE.lost;
      ctx.font = 'bold 11px Consolas, monospace';
      ctx.fillText('HALT: EMPTY SPOT', -50, -50);
    }
    ctx.restore();
  }

  let draggedObject = null;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    tableObjects.forEach((obj) => {
      if (Math.hypot(mx - obj.world.x, my - obj.world.y) < (obj.radius || 38)) {
        draggedObject = obj;
      }
    });
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!draggedObject) return;
    const rect = canvas.getBoundingClientRect();
    draggedObject.world.x = Math.max(40, Math.min(canvas.width - 40, (e.clientX - rect.left) * (canvas.width / rect.width)));
    draggedObject.world.y = Math.max(40, Math.min(canvas.height - 40, (e.clientY - rect.top) * (canvas.height / rect.height)));
    updateLedger();
    renderTable();
  });

  window.addEventListener('mouseup', () => {
    if (draggedObject) {
      draggedObject = null;
      updateLedger();
      renderTable();
    }
  });

  function stopAnim() {
    if (activeAnim) {
      clearInterval(activeAnim);
      activeAnim = null;
    }
  }

  btnMoveBottle.addEventListener('click', () => {
    stopAnim();
    const bottle = tableObjects.find((o) => o.id === 'bottle');
    bottle.world.x = 265;
    bottle.world.y = 225;
    hand.x = 400;
    hand.y = 410;
    hand.freeze = false;
    updateLedger();
    renderTable();
    setSpeechState('alert', 'Heads up, your bottle was moved. It is now on your left, left of the laptop.');
  });

  btnReachOldSpot.addEventListener('click', () => {
    stopAnim();
    const bottle = tableObjects.find((o) => o.id === 'bottle');
    hand.x = 400;
    hand.y = 410;
    hand.freeze = false;
    let step = 0;
    const startX = hand.x;
    const startY = hand.y;
    activeAnim = setInterval(() => {
      step += 0.05;
      hand.x = startX + (bottle.belief.x - startX) * step;
      hand.y = startY + (bottle.belief.y - startY) * step;
      if (Math.hypot(hand.x - bottle.belief.x, hand.y - bottle.belief.y) < 115) {
        stopAnim();
        hand.freeze = true;
        renderTable();
        setSpeechState('alert', 'Heads up, your bottle moved; it is now on your left, left of the laptop.');
      } else {
        renderTable();
      }
    }, 30);
  });

  btnReachNewSpot.addEventListener('click', () => {
    stopAnim();
    const bottle = tableObjects.find((o) => o.id === 'bottle');
    hand.x = 400;
    hand.y = 410;
    hand.freeze = false;
    let step = 0;
    const startX = hand.x;
    const startY = hand.y;
    activeAnim = setInterval(() => {
      step += 0.045;
      hand.x = startX + (bottle.world.x - startX) * step;
      hand.y = startY + (bottle.world.y - startY) * step;
      if (step >= 0.88) {
        stopAnim();
        bottle.belief.x = bottle.world.x;
        bottle.belief.y = bottle.world.y;
        updateLedger();
        renderTable();
        setSpeechState('said', 'You are touching it. Water bottle reached.');
      } else {
        renderTable();
      }
    }, 30);
  });

  btnResetTable.addEventListener('click', () => {
    stopAnim();
    const bottle = tableObjects.find((o) => o.id === 'bottle');
    bottle.world = { x: 550, y: 255 };
    bottle.belief = { x: 550, y: 255 };
    hand.x = 400;
    hand.y = 410;
    hand.freeze = false;
    updateLedger();
    renderTable();
    setSpeechState('silent');
  });

  // =========================================================================
  // 3. Module 4: System 2 Flash Pulse Sequence
  // =========================================================================
  const btnPulseFlash = document.getElementById('btnPulseFlash');
  const highlightReal = document.getElementById('highlightRealApple');
  const glassGlare = document.getElementById('glassGlare');

  btnPulseFlash.addEventListener('click', () => {
    btnPulseFlash.textContent = 'Pulsing Torch...';
    btnPulseFlash.disabled = true;
    let pulseCount = 0;
    const pulseTimer = setInterval(() => {
      pulseCount++;
      highlightReal.style.opacity = '1.0';
      glassGlare.style.opacity = '0.85';
      setTimeout(() => {
        highlightReal.style.opacity = '0.25';
        glassGlare.style.opacity = '0.10';
      }, 150);
      if (pulseCount >= 3) {
        clearInterval(pulseTimer);
        highlightReal.style.opacity = '0';
        glassGlare.style.opacity = '0';
        btnPulseFlash.textContent = 'Trigger Flash Pulse Sequence';
        btnPulseFlash.disabled = false;
      }
    }, 350);
  });

  // =========================================================================
  // 4. Module 6: 3D Interactive FMCW Glass Probe Simulation (SIMULATED - D63)
  // =========================================================================
  const fmcwCanvas = document.getElementById('fmcwCanvas');
  const fmcwCtx = fmcwCanvas.getContext('2d');
  const specCanvas = document.getElementById('fmcwSpectrum');
  const specCtx = specCanvas.getContext('2d');

  const btnRgbCheck = document.getElementById('btnRgbCheck');
  const btnFmcwChirp = document.getElementById('btnFmcwChirp');
  const rngGlassDist = document.getElementById('rngGlassDist');
  const rngGlassAngle = document.getElementById('rngGlassAngle');
  const lblGlassDist = document.getElementById('lblGlassDist');
  const lblGlassAngle = document.getElementById('lblGlassAngle');
  const btnModeIdeal = document.getElementById('btnModeIdeal');
  const btnModeVivo = document.getElementById('btnModeVivo');
  const fmcwSpeechBadge = document.getElementById('fmcwSpeechBadge');
  const fmcwModeBadge = document.getElementById('fmcwModeBadge');
  const fmcwAngleBadge = document.getElementById('fmcwAngleBadge');
  const fmcwMetrics = document.getElementById('fmcwMetrics');

  const fmcw = {
    distCm: 32,
    angleDeg: 18,
    yawDeg: 0,
    hardwareMode: 'ideal', // 'ideal' | 'vivo'
    rgbMissed: false,
    sweeping: false,
    wavePhase: 0,
    echoDetected: false,
    animId: null,
  };

  function bearingWords(deg) {
    if (Math.abs(deg) <= 12) return 'In Front';
    if (deg < -25) return 'On Left';
    if (deg < -12) return 'Slightly Left';
    if (deg > 25) return 'On Right';
    return 'Slightly Right';
  }

  function reachZoneWords(cm) {
    if (cm <= 50) return 'within reach';
    return 'just beyond reach';
  }

  // 3D perspective projection from table space (x right, y height, z depth in cm)
  function project3D(xCm, yCm, zCm) {
    const camY = 34;
    const camZ = -32;
    const dz = Math.max(18, zCm - camZ);
    const scale = 520 / dz;
    return {
      x: 400 + xCm * scale,
      y: 80 + (camY - yCm) * scale * 0.62,
      scale,
    };
  }

  function updateFmcwLabels() {
    const dir = bearingWords(fmcw.angleDeg);
    const sign = fmcw.angleDeg > 0 ? '+' : '';
    lblGlassDist.textContent = `${(fmcw.distCm / 100).toFixed(2)} m`;
    lblGlassAngle.textContent = `${sign}${fmcw.angleDeg}° (${dir})`;
    fmcwAngleBadge.textContent = `Yaw: ${Math.round(fmcw.yawDeg)}° · Glass: ${(fmcw.distCm / 100).toFixed(2)} m`;
    fmcwModeBadge.textContent = fmcw.hardwareMode === 'ideal'
      ? 'Ideal Ultrasonic (UNPROCESSED = true)'
      : 'Vivo V21e Reality (D63: UNPROCESSED = false)';

    const snr = fmcw.hardwareMode === 'ideal' ? '+18.4 dB' : '12.9–17.2 dB (masked)';
    const residual = fmcw.hardwareMode === 'ideal' ? '1.8% floor' : '25.4% HAL drift (D63)';
    const echo = fmcw.hardwareMode === 'ideal' ? '2.4% glass echo (CLEAR)' : '2.4% < 25.4% noise (REJECTED)';
    fmcwMetrics.innerHTML = `
      <div><strong>Band:</strong> 18–20 kHz FMCW · 48 kHz</div>
      <div><strong>Loopback SNR:</strong> ${snr}</div>
      <div><strong>Empty-Table Drift:</strong> ${residual}</div>
      <div><strong>Glass Signal:</strong> ${echo}</div>
    `;
  }

  function setFmcwSpeech(kind, line, sub) {
    fmcwSpeechBadge.className = `speech-dialogue-badge ${kind}`;
    fmcwSpeechBadge.innerHTML = `&ldquo;${line}&rdquo;<span style="font-size:11px; color:${PALETTE.inkSoft}; margin-top:3px; display:block;">${sub}</span>`;
  }

  function renderFmcwScene() {
    const c = fmcwCtx;
    c.clearRect(0, 0, fmcwCanvas.width, fmcwCanvas.height);
    c.fillStyle = PALETTE.surface;
    c.fillRect(0, 0, fmcwCanvas.width, fmcwCanvas.height);

    // 1. 3D Perspective Tabletop Quad
    const tl = project3D(-48, 0, 75);
    const tr = project3D(48, 0, 75);
    const br = project3D(48, 0, 8);
    const bl = project3D(-48, 0, 8);

    c.beginPath();
    c.moveTo(tl.x, tl.y); c.lineTo(tr.x, tr.y); c.lineTo(br.x, br.y); c.lineTo(bl.x, bl.y);
    c.closePath();
    c.fillStyle = PALETTE.paper;
    c.fill();
    c.strokeStyle = PALETTE.ink;
    c.lineWidth = 1.5;
    c.stroke();

    // Depth gridlines on 3D table
    c.strokeStyle = 'rgba(201, 205, 200, 0.7)';
    c.lineWidth = 1;
    for (let z = 15; z <= 70; z += 15) {
      const p1 = project3D(-48, 0, z);
      const p2 = project3D(48, 0, z);
      c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
      c.fillStyle = PALETTE.faint;
      c.font = '10px Consolas, monospace';
      c.fillText(`${z}cm`, p2.x + 6, p2.y + 3);
    }
    for (let x = -36; x <= 36; x += 18) {
      const p1 = project3D(x, 0, 8);
      const p2 = project3D(x, 0, 75);
      c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
    }

    // 2. Opaque Reference Mug on left (RGB detects fine)
    const mugBase = project3D(-22, 0, 44);
    const mugTop = project3D(-22, 10, 44);
    c.fillStyle = PALETTE.paperSurface;
    c.strokeStyle = PALETTE.ink;
    c.lineWidth = 1.4;
    c.fillRect(mugBase.x - 16, mugTop.y, 32, mugBase.y - mugTop.y);
    c.strokeRect(mugBase.x - 16, mugTop.y, 32, mugBase.y - mugTop.y);
    c.fillStyle = PALETTE.inkSoft;
    c.font = '600 10.5px Consolas, monospace';
    c.fillText('Opaque Mug (RGB OK)', mugBase.x - 52, mugTop.y - 8);

    // 3. Phone Emitter / Camera FOV Cone along Gyro Yaw
    const radYaw = (fmcw.yawDeg * Math.PI) / 180;
    const phonePos = project3D(0, 3, 6);
    const coneLen = 68;
    const leftRay = project3D(Math.sin(radYaw - 0.34) * coneLen, 0, Math.cos(radYaw - 0.34) * coneLen);
    const rightRay = project3D(Math.sin(radYaw + 0.34) * coneLen, 0, Math.cos(radYaw + 0.34) * coneLen);

    c.beginPath();
    c.moveTo(phonePos.x, phonePos.y);
    c.lineTo(leftRay.x, leftRay.y);
    c.lineTo(rightRay.x, rightRay.y);
    c.closePath();
    c.fillStyle = 'rgba(44, 93, 138, 0.09)';
    c.fill();
    c.strokeStyle = 'rgba(44, 93, 138, 0.42)';
    c.setLineDash([4, 4]);
    c.stroke();
    c.setLineDash([]);

    // 4. Transparent Glass Cylinder (3D Wireframe + Rim Ellipses)
    const radGlass = (fmcw.angleDeg * Math.PI) / 180;
    const gx = Math.sin(radGlass) * fmcw.distCm;
    const gz = Math.cos(radGlass) * fmcw.distCm;
    const gBase = project3D(gx, 0, gz);
    const gTop = project3D(gx, 14, gz);
    const rX = Math.max(12, 18 * gBase.scale * 0.14);
    const rY = rX * 0.34;

    // Translucent glass fill
    c.fillStyle = 'rgba(44, 93, 138, 0.11)';
    c.fillRect(gBase.x - rX, gTop.y, rX * 2, gBase.y - gTop.y);

    // Glass walls & specular highlight
    c.strokeStyle = PALETTE.belief;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(gBase.x - rX, gBase.y); c.lineTo(gTop.x - rX, gTop.y);
    c.moveTo(gBase.x + rX, gBase.y); c.lineTo(gTop.x + rX, gTop.y);
    c.stroke();

    c.beginPath();
    c.ellipse(gBase.x, gBase.y, rX, rY, 0, 0, 2 * Math.PI);
    c.stroke();

    c.beginPath();
    c.ellipse(gTop.x, gTop.y, rX, rY, 0, 0, 2 * Math.PI);
    c.fillStyle = 'rgba(255, 255, 255, 0.6)';
    c.fill();
    c.stroke();

    // Label above glass
    if (fmcw.rgbMissed) {
      c.strokeStyle = PALETTE.lost;
      c.setLineDash([4, 3]);
      c.strokeRect(gTop.x - rX - 10, gTop.y - 10, (rX + 10) * 2, gBase.y - gTop.y + 18);
      c.setLineDash([]);
      c.fillStyle = PALETTE.lost;
      c.font = 'bold 11px Consolas, monospace';
      c.fillText('RGB: 0% CONFIDENCE (INVISIBLE)', gTop.x - 86, gTop.y - 18);
    } else if (fmcw.echoDetected) {
      const boxCol = fmcw.hardwareMode === 'ideal' ? PALETTE.said : PALETTE.lost;
      c.strokeStyle = boxCol;
      c.lineWidth = 2;
      c.strokeRect(gTop.x - rX - 8, gTop.y - 8, (rX + 8) * 2, gBase.y - gTop.y + 14);
      c.fillStyle = boxCol;
      c.font = 'bold 11px Consolas, monospace';
      const tag = fmcw.hardwareMode === 'ideal'
        ? `ECHO LOCKED: ${(fmcw.distCm / 100).toFixed(2)} m`
        : 'MASKED BY 25.4% HAL DRIFT';
      c.fillText(tag, gTop.x - 66, gTop.y - 16);
    } else {
      c.fillStyle = PALETTE.belief;
      c.font = '600 11px Consolas, monospace';
      c.fillText('Clear Glass (No RGB Box)', gTop.x - 72, gTop.y - 16);
    }

    // 5. Outgoing 18-20 kHz FMCW Chirp Waves & Returning Echo (Projected on 3D Table Plane)
    const activeWave = fmcw.sweeping || fmcw.echoDetected;
    const waveCount = activeWave ? 3 : 1;
    for (let i = 0; i < waveCount; i++) {
      const t = activeWave ? ((fmcw.wavePhase + i * 0.33) % 1) : 0.45;
      const wDist = 12 + t * (fmcw.distCm + 16);
      c.beginPath();
      for (let step = 0; step <= 18; step++) {
        const a = radYaw - 0.34 + (step / 18) * 0.68;
        const wp = project3D(Math.sin(a) * wDist, 2, 6 + Math.cos(a) * wDist);
        if (step === 0) c.moveTo(wp.x, wp.y);
        else c.lineTo(wp.x, wp.y);
      }
      c.strokeStyle = activeWave
        ? `rgba(44, 93, 138, ${Math.max(0.15, 0.85 - t * 0.65)})`
        : 'rgba(44, 93, 138, 0.25)';
      c.lineWidth = activeWave ? 2.2 : 1.2;
      c.stroke();

      if (activeWave) {
        const hitDiff = Math.abs(fmcw.yawDeg - fmcw.angleDeg);
        if (hitDiff < 20 || fmcw.echoDetected) {
          const echoR = ((fmcw.wavePhase + i * 0.33) % 1) * 18 + 6;
          c.beginPath();
          for (let step = 0; step <= 14; step++) {
            const a = radGlass + Math.PI - 0.8 + (step / 14) * 1.6;
            const ep = project3D(gx + Math.sin(a) * echoR, 4, gz + Math.cos(a) * echoR);
            if (step === 0) c.moveTo(ep.x, ep.y);
            else c.lineTo(ep.x, ep.y);
          }
          c.strokeStyle = fmcw.hardwareMode === 'ideal' ? PALETTE.said : PALETTE.lost;
          c.lineWidth = 2;
          c.stroke();
        }
      }
    }

    // 6. Phone / Emitter Unit at bottom foreground
    c.fillStyle = PALETTE.ink;
    c.fillRect(phonePos.x - 36, phonePos.y - 10, 72, 22);
    c.strokeStyle = PALETTE.paper;
    c.lineWidth = 1;
    c.strokeRect(phonePos.x - 32, phonePos.y - 7, 64, 16);
    c.fillStyle = PALETTE.paper;
    c.font = 'bold 9.5px Consolas, monospace';
    c.fillText('FMCW + IMU', phonePos.x - 28, phonePos.y + 4);
  }

  function renderFmcwSpectrum() {
    const s = specCtx;
    const w = specCanvas.width;
    const h = specCanvas.height;
    s.clearRect(0, 0, w, h);
    s.fillStyle = PALETTE.paper;
    s.fillRect(0, 0, w, h);

    // Axes & threshold line
    s.strokeStyle = PALETTE.rule;
    s.lineWidth = 1;
    const baseY = h - 22;
    s.beginPath(); s.moveTo(26, baseY); s.lineTo(w - 10, baseY); s.stroke();

    // Detection threshold
    const threshY = baseY - 36;
    s.strokeStyle = PALETTE.unsure;
    s.setLineDash([4, 3]);
    s.beginPath(); s.moveTo(26, threshY); s.lineTo(w - 10, threshY); s.stroke();
    s.setLineDash([]);
    s.fillStyle = PALETTE.unsure;
    s.font = '9.5px Consolas, monospace';
    s.fillText('Threshold', w - 62, threshY - 4);

    // Distance labels 10..70 cm
    s.fillStyle = PALETTE.faint;
    [15, 30, 45, 60].forEach((cm) => {
      const px = 26 + ((cm - 10) / 60) * (w - 40);
      s.fillText(`${cm}cm`, px - 10, h - 7);
    });

    // Draw differential FFT curve
    const peakX = 26 + ((fmcw.distCm - 10) / 60) * (w - 40);
    s.beginPath();
    for (let x = 26; x <= w - 10; x += 3) {
      const d = Math.abs(x - peakX);
      const glassPeak = 52 * Math.exp(-(d * d) / 110);
      const noiseAmp = fmcw.hardwareMode === 'ideal'
        ? 4 + 2.5 * Math.sin(x * 0.45)
        : 28 + 18 * Math.sin(x * 0.27) + 12 * Math.cos(x * 0.63);
      const mag = Math.min(baseY - 12, noiseAmp + glassPeak * (fmcw.hardwareMode === 'ideal' ? 1 : 0.35));
      const y = baseY - mag;
      if (x === 26) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.strokeStyle = fmcw.hardwareMode === 'ideal' ? PALETTE.said : PALETTE.lost;
    s.lineWidth = 2;
    s.stroke();

    s.fillStyle = PALETTE.ink;
    s.font = 'bold 10px Consolas, monospace';
    s.fillText(
      fmcw.hardwareMode === 'ideal'
        ? `Peak @ ${fmcw.distCm} cm (+18.4 dB)`
        : 'D63 Vivo V21e: 25.4% Stationary Residual',
      30,
      14
    );
  }

  btnRgbCheck.addEventListener('click', () => {
    if (fmcw.animId) { cancelAnimationFrame(fmcw.animId); fmcw.animId = null; }
    fmcw.sweeping = false;
    fmcw.echoDetected = false;
    fmcw.rgbMissed = true;
    fmcw.yawDeg = fmcw.angleDeg;
    updateFmcwLabels();
    renderFmcwScene();
    renderFmcwSpectrum();
    setFmcwSpeech(
      'alert',
      'RGB camera sees only the mug — transparent glass is 0% confidence.',
      'Why pure RGB vision fails on clear glassware.'
    );
  });

  btnFmcwChirp.addEventListener('click', () => {
    if (fmcw.animId) cancelAnimationFrame(fmcw.animId);
    fmcw.rgbMissed = false;
    fmcw.echoDetected = false;
    fmcw.sweeping = true;
    fmcw.yawDeg = -28;
    let frame = 0;

    function tick() {
      frame++;
      fmcw.wavePhase = (fmcw.wavePhase + 0.03) % 1;
      fmcw.yawDeg = -28 + (frame / 75) * 56;
      updateFmcwLabels();
      renderFmcwScene();

      if (frame < 75) {
        fmcw.animId = requestAnimationFrame(tick);
      } else {
        fmcw.sweeping = false;
        fmcw.echoDetected = true;
        fmcw.yawDeg = fmcw.angleDeg;
        updateFmcwLabels();
        renderFmcwScene();
        renderFmcwSpectrum();

        if (fmcw.hardwareMode === 'ideal') {
          const dir = bearingWords(fmcw.angleDeg).toLowerCase();
          const zone = reachZoneWords(fmcw.distCm);
          setFmcwSpeech(
            'said-ok',
            `Obstacle ${zone}, ${dir}.`,
            `SIMULATED: 18–20 kHz echo peak at ${fmcw.distCm} cm.`
          );
        } else {
          setFmcwSpeech(
            'alert',
            'Acoustic probe suppressed: 25.4% HAL drift exceeds 1–3% glass echo (D63).',
            'Honest hardware finding on Vivo V21e — discarded from APK.'
          );
        }
      }
    }
    fmcw.animId = requestAnimationFrame(tick);
  });

  rngGlassDist.addEventListener('input', (e) => {
    fmcw.distCm = parseInt(e.target.value, 10);
    updateFmcwLabels();
    renderFmcwScene();
    renderFmcwSpectrum();
  });

  rngGlassAngle.addEventListener('input', (e) => {
    fmcw.angleDeg = parseInt(e.target.value, 10);
    updateFmcwLabels();
    renderFmcwScene();
    renderFmcwSpectrum();
  });

  btnModeIdeal.addEventListener('click', () => {
    fmcw.hardwareMode = 'ideal';
    btnModeIdeal.classList.add('active-mode');
    btnModeVivo.classList.remove('active-mode');
    updateFmcwLabels();
    renderFmcwScene();
    renderFmcwSpectrum();
  });

  btnModeVivo.addEventListener('click', () => {
    fmcw.hardwareMode = 'vivo';
    btnModeVivo.classList.add('active-mode');
    btnModeIdeal.classList.remove('active-mode');
    updateFmcwLabels();
    renderFmcwScene();
    renderFmcwSpectrum();
  });

  // Initial render (and support #module-N hash links)
  updateLedger();
  renderTable();
  updateFmcwLabels();
  renderFmcwScene();
  renderFmcwSpectrum();

  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(initialHash)) {
    switchTab(initialHash);
  }
});
