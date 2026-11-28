/**
 * SAARTHI — Presentation & Simulation Reactive Engine
 * Architectural, zero-dependency, pure JS.
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. Navigation & Presentation Timer
  // =========================================================================
  const navTabs = document.querySelectorAll('.nav-tab');
  const modules = document.querySelectorAll('.module-container');
  let currentTabIndex = 0;

  function switchTab(tabId) {
    navTabs.forEach((tab, idx) => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
        currentTabIndex = idx;
      } else {
        tab.classList.remove('active');
      }
    });

    modules.forEach(mod => {
      if (mod.id === tabId) {
        mod.classList.add('active');
      } else {
        mod.classList.remove('active');
      }
    });

    if (tabId === 'module-3') {
      renderTable();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Keyboard navigation [1-5] and Arrows
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key >= '1' && e.key <= '5') {
      const idx = parseInt(e.key) - 1;
      const tab = navTabs[idx];
      if (tab) switchTab(tab.dataset.tab);
    } else if (e.key === 'ArrowRight' && currentTabIndex < navTabs.length - 1) {
      switchTab(navTabs[currentTabIndex + 1].dataset.tab);
    } else if (e.key === 'ArrowLeft' && currentTabIndex > 0) {
      switchTab(navTabs[currentTabIndex - 1].dataset.tab);
    }
  });

  // Pitch Timer (6:00 Target)
  const timerBadge = document.getElementById('presentationTimer');
  const btnTimerToggle = document.getElementById('btnTimerToggle');
  const btnTimerReset = document.getElementById('btnTimerReset');
  let timerInterval = null;
  let elapsedSeconds = 0;

  function updateTimerDisplay() {
    const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
    timerBadge.textContent = `${mins}:${secs} / 06:00`;

    if (elapsedSeconds > 360 && elapsedSeconds <= 420) {
      timerBadge.style.color = 'var(--accent-warm)';
    } else if (elapsedSeconds > 420) {
      timerBadge.style.color = 'var(--accent-ruby)';
    } else {
      timerBadge.style.color = 'var(--text-primary)';
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
  // 2. Module 3: Two-Map Sally-Anne Simulation (Table Canvas)
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

  // Origin at user chest: center bottom
  const origin = { x: 400, y: 460 };

  // Objects on table
  let tableObjects = [
    {
      id: 'bottle',
      name: 'Water Bottle',
      color: '#4f8ecc',
      world: { x: 550, y: 270 }, // on your right initial
      belief: { x: 550, y: 270 },
      radius: 18,
      isDragging: false
    },
    {
      id: 'mug',
      name: 'Coffee Mug',
      color: '#d97736',
      world: { x: 480, y: 340 }, // slightly to your right
      belief: { x: 480, y: 340 },
      radius: 16,
      isDragging: false
    },
    {
      id: 'laptop',
      name: 'Laptop (Anchor)',
      color: '#626b7d',
      world: { x: 400, y: 220 }, // in front of you
      belief: { x: 400, y: 220 },
      width: 100,
      height: 60,
      isDragging: false
    }
  ];

  let hand = {
    x: 400,
    y: 430,
    targetX: 400,
    targetY: 430,
    isMoving: false,
    freeze: false,
    rayAngle: -Math.PI / 2
  };

  function updateLedger() {
    const bottle = tableObjects.find(o => o.id === 'bottle');
    const mug = tableObjects.find(o => o.id === 'mug');
    const distSq = Math.hypot(bottle.world.x - bottle.belief.x, bottle.world.y - bottle.belief.y);
    const hasDiverged = distSq > 40;

    let html = `<div><strong>Water Bottle:</strong> `;
    if (hasDiverged) {
      html += `World (on your left, left of laptop) vs Belief (on your right) <span style="color: var(--accent-warm);">[DIVERGENCE DETECTED]</span></div>`;
      divergenceBadge.textContent = 'State: Divergence Detected (Sally–Anne Engine Active)';
      divergenceBadge.style.color = 'var(--accent-warm)';
    } else {
      html += `World (on your right) · Beliefs Agree</div>`;
      divergenceBadge.textContent = 'State: Synchronized (Beliefs Agree)';
      divergenceBadge.style.color = 'var(--accent-emerald)';
    }

    html += `<div><strong>Coffee Mug:</strong> slightly to your right · Beliefs Agree</div>`;
    html += `<div><strong>Laptop:</strong> in front of you · Stationary Landmark Anchor</div>`;
    ledgerInfo.innerHTML = html;
  }

  function setSpeechState(isSpeaking, text = '') {
    if (isSpeaking) {
      speechBadge.className = 'speech-dialogue-badge speaking';
      speechBadge.innerHTML = `&ldquo;${text}&rdquo;<span style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">Spoken proactively because physical reality diverged from belief.</span>`;
    } else {
      speechBadge.className = 'speech-dialogue-badge silent';
      speechBadge.innerHTML = `[PROACTIVELY SILENT]<span style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">Reality matches user belief. No unnecessary chatter.</span>`;
    }
  }

  function renderTable() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Grid & Distance Arcs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Reach Arcs from user chest
    // Green Arc: <0.50m (r = 240px)
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 230, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(46, 160, 67, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // Amber Arc: <0.75m (r = 350px)
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 350, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(217, 119, 54, 0.25)';
    ctx.stroke();
    ctx.setLineDash([]);

    // Direction Rays: Left, Slightly Left, In Front, Slightly Right, Right
    const rayAngles = [
      { h: 'Left', a: Math.PI },
      { h: 'Left', a: (5 * Math.PI) / 6 },
      { h: 'Slight L', a: (4 * Math.PI) / 6 },
      { h: 'In Front', a: Math.PI / 2 },
      { h: 'Slight R', a: Math.PI / 3 },
      { h: 'Right', a: Math.PI / 6 },
      { h: 'Right', a: 0 }
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillStyle = '#626b7d';
    ctx.font = '10px JetBrains Mono';
    rayAngles.forEach(r => {
      const rayX = origin.x - 390 * Math.cos(r.a);
      const rayY = origin.y - 390 * Math.sin(r.a);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(rayX, rayY);
      ctx.stroke();

      const labelX = origin.x - 410 * Math.cos(r.a);
      const labelY = origin.y - 410 * Math.sin(r.a);
      ctx.fillText(r.h, labelX - 8, labelY + 4);
    });

    // User Position (Chest marker)
    ctx.fillStyle = '#9aa2b1';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#0d0f14';
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.fillText('YOU', origin.x - 10, origin.y + 3);

    // 2. Render Objects
    tableObjects.forEach(obj => {
      if (obj.width) {
        // Laptop
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.world.x - obj.width / 2, obj.world.y - obj.height / 2, obj.width, obj.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(obj.world.x - obj.width / 2, obj.world.y - obj.height / 2, obj.width, obj.height);
        ctx.fillStyle = '#f0f3f8';
        ctx.font = '11px Inter';
        ctx.fillText(obj.name, obj.world.x - 38, obj.world.y + 4);
      } else {
        // Check divergence between belief and world
        const dist = Math.hypot(obj.world.x - obj.belief.x, obj.world.y - obj.belief.y);
        
        // Draw Belief Ghost (Dotted Circle) if diverged
        if (dist > 30) {
          ctx.beginPath();
          ctx.arc(obj.belief.x, obj.belief.y, obj.radius, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(217, 119, 54, 0.6)';
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(217, 119, 54, 0.15)';
          ctx.fill();
          ctx.fillStyle = 'var(--accent-warm)';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText(`Believed [${obj.name}]`, obj.belief.x - 45, obj.belief.y - obj.radius - 6);
        }

        // Draw Physical World Object
        ctx.beginPath();
        ctx.arc(obj.world.x, obj.world.y, obj.radius, 0, 2 * Math.PI);
        ctx.fillStyle = obj.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f0f3f8';
        ctx.font = '11px Inter';
        ctx.fillText(obj.name, obj.world.x - 32, obj.world.y + obj.radius + 15);
      }
    });

    // 3. Render Virtual Hand & Raycast
    ctx.save();
    ctx.translate(hand.x, hand.y);

    // Hand palm
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, 2 * Math.PI);
    ctx.fillStyle = hand.freeze ? '#e5534b' : '#2ea043';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Index Raycast
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -45);
    ctx.strokeStyle = hand.freeze ? 'rgba(229, 83, 75, 0.8)' : 'rgba(46, 160, 67, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (hand.freeze) {
      ctx.fillStyle = '#e5534b';
      ctx.font = 'bold 11px JetBrains Mono';
      ctx.fillText('HALT: EMPTY SPOT', -50, -55);
    }

    ctx.restore();
  }

  // Interactivity: Dragging objects
  let draggedObject = null;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    tableObjects.forEach(obj => {
      const dist = Math.hypot(mx - obj.world.x, my - obj.world.y);
      if (dist < (obj.radius || 30)) {
        draggedObject = obj;
      }
    });
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!draggedObject) return;
    const rect = canvas.getBoundingClientRect();
    draggedObject.world.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    draggedObject.world.y = (e.clientY - rect.top) * (canvas.height / rect.height);
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

  // Action Button 1: Partner Moves Water Bottle
  btnMoveBottle.addEventListener('click', () => {
    const bottle = tableObjects.find(o => o.id === 'bottle');
    bottle.world.x = 260; // Moved on your left (left of laptop)
    bottle.world.y = 230;
    // Notice: bottle.belief stays at 550, 270!
    hand.x = 400; hand.y = 430; hand.freeze = false;
    updateLedger();
    renderTable();

    // PROACTIVE SILENCE: SAARTHI says nothing yet!
    setSpeechState(false);
  });

  // Action Button 2: User reaches for Old Spot (Sally-Anne Divergence Alert)
  btnReachOldSpot.addEventListener('click', () => {
    const bottle = tableObjects.find(o => o.id === 'bottle');
    hand.freeze = false;

    // Animate hand reaching toward belief position (550, 270)
    let step = 0;
    const startX = hand.x, startY = hand.y;
    const targetX = bottle.belief.x;
    const targetY = bottle.belief.y;

    const anim = setInterval(() => {
      step += 0.05;
      hand.x = startX + (targetX - startX) * step;
      hand.y = startY + (targetY - startY) * step;

      // When reaching within 140px of old spot, Sally-Anne divergence intercepts!
      const distToOldSpot = Math.hypot(hand.x - targetX, hand.y - targetY);
      if (distToOldSpot < 130) {
        clearInterval(anim);
        hand.freeze = true;
        renderTable();
        setSpeechState(true, 'Heads up, your water bottle moved; it\'s now on your left, left of your laptop.');
      } else {
        renderTable();
      }
    }, 30);
  });

  // Action Button 3: Guide hand to real bottle
  btnReachNewSpot.addEventListener('click', () => {
    const bottle = tableObjects.find(o => o.id === 'bottle');
    hand.freeze = false;
    let step = 0;
    const startX = hand.x, startY = hand.y;
    const targetX = bottle.world.x;
    const targetY = bottle.world.y;

    const anim = setInterval(() => {
      step += 0.04;
      hand.x = startX + (targetX - startX) * step;
      hand.y = startY + (targetY - startY) * step;

      if (step >= 0.85) {
        clearInterval(anim);
        // User reaches real bottle; belief synchronizes!
        bottle.belief.x = bottle.world.x;
        bottle.belief.y = bottle.world.y;
        updateLedger();
        renderTable();
        setSpeechState(true, 'You\'re touching it. Water bottle reached on your left.');
      } else {
        renderTable();
      }
    }, 30);
  });

  // Reset Table
  btnResetTable.addEventListener('click', () => {
    const bottle = tableObjects.find(o => o.id === 'bottle');
    bottle.world = { x: 550, y: 270 };
    bottle.belief = { x: 550, y: 270 };
    hand.x = 400; hand.y = 430; hand.freeze = false;
    updateLedger();
    renderTable();
    setSpeechState(false);
  });


  // =========================================================================
  // 3. Module 4: System 2 Flash Pulse Interactivity
  // =========================================================================
  const btnPulseFlash = document.getElementById('btnPulseFlash');
  const highlightReal = document.getElementById('highlightRealApple');
  const glassGlare = document.getElementById('glassGlare');

  btnPulseFlash.addEventListener('click', () => {
    btnPulseFlash.textContent = 'Pulsing Flashlight...';
    btnPulseFlash.disabled = true;

    // Simulate 3 exposure-locked pulses
    let pulseCount = 0;
    const pulseTimer = setInterval(() => {
      pulseCount++;
      // Flash ON
      highlightReal.style.opacity = '1.0';
      highlightReal.style.transform = 'scale(1.2)';
      glassGlare.style.opacity = '0.7';

      setTimeout(() => {
        // Flash OFF
        highlightReal.style.opacity = '0.5';
        highlightReal.style.transform = 'scale(1.0)';
        glassGlare.style.opacity = '0.15';
      }, 150);

      if (pulseCount >= 3) {
        clearInterval(pulseTimer);
        btnPulseFlash.textContent = 'Trigger Flash Pulse Sequence';
        btnPulseFlash.disabled = false;
      }
    }, 350);
  });

  // Initial draw
  updateLedger();
  renderTable();

});
