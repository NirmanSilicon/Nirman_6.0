import * as THREE from "./vendor/three.module.js";

const MODE_CONFIG = {
  crash: {
    cruiseKmh: 72,
    peakG: 18.4,
  },
  pothole: {
    cruiseKmh: 52,
    peakG: 3.8,
  },
  hard_brake: {
    cruiseKmh: 60,
    peakG: 5.6,
  },
};

const DEG = Math.PI / 180;
const KM_H_TO_M_S = 1000 / 3600;

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function easeOutCubic(t) {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

export function mountScene(container, options = {}) {
  container.innerHTML = "";
  container.style.position = "relative";

  const width = Math.max(container.clientWidth || 640, 640);
  const height = Math.max(container.clientHeight || 360, 360);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "scene-canvas";
  container.appendChild(renderer.domElement);

  const hud = document.createElement("div");
  hud.className = "scene-hud";
  hud.innerHTML =
    `<div class="hud-chip"><span class="hud-k">SPEED</span><span class="hud-v" id="hud-speed">0 km/h</span></div>` +
    `<div class="hud-chip"><span class="hud-k">BRAKE</span><span class="hud-v" id="hud-g">0.0 g</span></div>` +
    `<div class="hud-state" id="hud-state">CRUISING</div>`;
  container.appendChild(hud);

  const speedEl = hud.querySelector("#hud-speed");
  const gEl = hud.querySelector("#hud-g");
  const stateEl = hud.querySelector("#hud-state");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdce6f2);
  scene.fog = new THREE.Fog(0xdce6f2, 35, 110);

  const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);

  const hemi = new THREE.HemisphereLight(0xeef6ff, 0x374151, 0.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(12, 20, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);
  scene.add(sun.target);

  // Road (200 x 8), dashed centre line, and two low guardrails.
  const roadGroup = new THREE.Group();
  scene.add(roadGroup);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.9 });
  const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(200, 0.2, 8), roadMat);
  roadMesh.position.y = -0.1;
  roadMesh.receiveShadow = true;
  roadGroup.add(roadMesh);

  const dashMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
  const dashGeo = new THREE.BoxGeometry(2.4, 0.02, 0.18);
  const dashes = [];
  for (let x = -95; x <= 95; x += 5) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(x, 0.01, 0);
    dash.receiveShadow = true;
    roadGroup.add(dash);
    dashes.push(dash);
  }

  const railMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5, metalness: 0.25 });
  const railGeo = new THREE.BoxGeometry(200, 0.45, 0.18);
  const leftRail = new THREE.Mesh(railGeo, railMat);
  leftRail.position.set(0, 0.225, -4.1);
  leftRail.castShadow = true;
  leftRail.receiveShadow = true;
  roadGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, railMat);
  rightRail.position.set(0, 0.225, 4.1);
  rightRail.castShadow = true;
  rightRail.receiveShadow = true;
  roadGroup.add(rightRail);

  // Car built from primitives.
  const carRoot = new THREE.Group();
  scene.add(carRoot);

  const carBodyGroup = new THREE.Group();
  carRoot.add(carBodyGroup);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.15 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    roughness: 0.15,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 1.8), bodyMat);
  bodyMesh.position.set(0, 0.85, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  carBodyGroup.add(bodyMesh);

  const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 1.6), bodyMat);
  cabinMesh.position.set(-0.2, 1.8, 0);
  cabinMesh.castShadow = true;
  cabinMesh.receiveShadow = true;
  carBodyGroup.add(cabinMesh);

  const windscreen = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.68), glassMat);
  windscreen.position.set(0.83, 1.78, 0);
  windscreen.rotation.y = Math.PI / 2;
  windscreen.rotation.x = -0.22;
  carBodyGroup.add(windscreen);

  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 20);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelOffsets = [
    [1.3, 0.33, -0.92],
    [1.3, 0.33, 0.92],
    [-1.3, 0.33, -0.92],
    [-1.3, 0.33, 0.92],
  ];
  const wheels = wheelOffsets.map(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    carRoot.add(wheel);
    return wheel;
  });

  // Debris pool for crash mode (six small boxes).
  const debrisGeo = new THREE.BoxGeometry(0.22, 0.14, 0.22);
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const debrisItems = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(debrisGeo, debrisMat);
    mesh.castShadow = true;
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh,
      vx: 0,
      vy: 0,
      vz: 0,
      rx: 0,
      rz: 0,
    };
  });

  let activeMode = "crash";
  let isPlaying = false;
  let simTime = 0;
  let carX = 0;
  let debrisSpawned = false;
  let rafId = null;
  let destroyed = false;
  const clock = new THREE.Clock(false);

  function updateHud(speedKmh, peakG, stateLabel) {
    speedEl.textContent = `${Math.round(speedKmh)} km/h`;
    gEl.textContent = `${peakG.toFixed(1)} g`;
    stateEl.textContent = stateLabel;
    stateEl.dataset.state = stateLabel;
    if (typeof options.onStateChange === "function") {
      options.onStateChange({ speedKmh, peakG, stateLabel });
    }
  }

  function hideDebris() {
    debrisSpawned = false;
    debrisItems.forEach((d) => {
      d.mesh.visible = false;
    });
  }

  function spawnDebris() {
    debrisSpawned = true;
    debrisItems.forEach((d, idx) => {
      const spread = (idx - 2.5) * 0.32;
      d.mesh.position.set(carX + 2.1, 0.55 + (idx % 2) * 0.2, spread * 0.6);
      d.mesh.rotation.set(0, idx * 0.5, 0);
      d.vx = 3.0 + (idx % 3) * 1.4;
      d.vy = 2.4 + (idx % 2) * 1.1;
      d.vz = spread * 1.6;
      d.rx = 5.0 + idx;
      d.rz = 4.0 + idx * 0.7;
      d.mesh.visible = true;
    });
  }

  function stepDebris(dt) {
    if (!debrisSpawned) return;
    debrisItems.forEach((d) => {
      if (d.mesh.position.y > 0.07 || d.vy > 0) {
        d.vy -= 9.8 * dt;
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.mesh.position.z += d.vz * dt;
        d.mesh.rotation.x += d.rx * dt;
        d.mesh.rotation.z += d.rz * dt;
        if (d.mesh.position.y <= 0.07) {
          d.mesh.position.y = 0.07;
          d.vx = 0;
          d.vy = 0;
          d.vz = 0;
        }
      }
    });
  }

  function syncRoadAndCamera(shakeX, shakeY, shakeZ) {
    carRoot.position.x = carX;

    // Keep road, rails, and dashes centered around carX without seam jumps.
    roadMesh.position.x = carX;
    leftRail.position.x = carX;
    rightRail.position.x = carX;
    const modX = ((carX % 5) + 5) % 5;
    dashes.forEach((dash, idx) => {
      dash.position.x = carX - 95 + idx * 5 - modX;
    });

    sun.position.set(carX + 12, 20, -10);
    sun.target.position.set(carX, 0, 0);
    sun.target.updateMatrixWorld();

    camera.position.set(carX - 7.5 + shakeX, 3.2 + shakeY, -2.6 + shakeZ);
    camera.lookAt(carX + 0.8, 1.0, 0);
  }

  function renderFrame(dt) {
    const cfg = MODE_CONFIG[activeMode] || MODE_CONFIG.crash;
    let speedKmh = 0;
    let peakG = 0;
    let stateLabel = "CRUISING";
    let pitchRad = 0;
    let rollRad = 0;
    let bodyY = 0;
    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;

    if (!isPlaying) {
      updateHud(0, 0, "CRUISING");
      syncRoadAndCamera(0, 0, 0);
      renderer.render(scene, camera);
      return;
    }

    simTime += dt;

    if (simTime < 2.0) {
      speedKmh = cfg.cruiseKmh * easeOutCubic(simTime / 1.4);
      peakG = 0.0;
      stateLabel = "CRUISING";
    } else if (activeMode === "crash") {
      const since = simTime - 2.0;
      if (!debrisSpawned) spawnDebris();
      peakG = cfg.peakG;

      if (since <= 0.12) {
        speedKmh = cfg.cruiseKmh * (1 - since / 0.12);
        pitchRad = -6 * DEG * (since / 0.12);
        stateLabel = "IMPACT";
      } else if (since <= 0.55) {
        speedKmh = 0;
        const settle = (since - 0.12) / 0.43;
        pitchRad = -6 * DEG * (1 - settle * 0.75);
        stateLabel = since <= 0.35 ? "IMPACT" : "STOPPED";
      } else {
        speedKmh = 0;
        pitchRad = -1.5 * DEG;
        stateLabel = "STOPPED";
      }

      if (since <= 0.3) {
        const amp = 0.32 * (1 - since / 0.3);
        shakeX = Math.sin(since * 75) * amp * 0.5;
        shakeY = Math.cos(since * 90) * amp;
        shakeZ = Math.sin(since * 65) * amp;
      }

      stepDebris(dt);
    } else if (activeMode === "pothole") {
      const since = simTime - 2.0;
      speedKmh = cfg.cruiseKmh;
      peakG = cfg.peakG;
      if (since <= 0.25) {
        const u = since / 0.25;
        const pulse = Math.sin(u * Math.PI);
        bodyY = 0.12 * pulse;
        rollRad = 4 * DEG * pulse;
        stateLabel = "IMPACT";
      } else {
        stateLabel = "CRUISING";
      }
    } else if (activeMode === "hard_brake") {
      const since = simTime - 2.0;
      peakG = cfg.peakG;
      if (since <= 1.5) {
        const u = since / 1.5;
        speedKmh = cfg.cruiseKmh + (14 - cfg.cruiseKmh) * easeOutCubic(u);
        pitchRad = -3 * DEG * Math.sin(clamp01(u) * Math.PI);
        stateLabel = "IMPACT";
      } else {
        speedKmh = 14;
        pitchRad = 0;
        stateLabel = "CRUISING";
      }
    }

    const speedMs = speedKmh * KM_H_TO_M_S;
    carX += speedMs * dt;
    wheels.forEach((w) => {
      w.rotation.z -= (speedMs * dt) / 0.33;
    });

    carBodyGroup.position.y = bodyY;
    carBodyGroup.rotation.z = pitchRad;
    carBodyGroup.rotation.x = rollRad;

    updateHud(speedKmh, peakG, stateLabel);
    syncRoadAndCamera(shakeX, shakeY, shakeZ);
    renderer.render(scene, camera);
  }

  function loop() {
    if (destroyed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    renderFrame(dt);
    rafId = requestAnimationFrame(loop);
  }

  function resize() {
    if (destroyed) return;
    const w = Math.max(container.clientWidth || 640, 640);
    const h = Math.max(container.clientHeight || 360, 360);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function reset() {
    isPlaying = false;
    simTime = 0;
    carX = 0;
    carBodyGroup.position.set(0, 0, 0);
    carBodyGroup.rotation.set(0, 0, 0);
    wheels.forEach((w) => {
      w.rotation.z = 0;
    });
    hideDebris();
    clock.stop();
    renderFrame(0);
  }

  function play(mode) {
    if (!MODE_CONFIG[mode]) {
      throw new Error(`Unsupported 3D scene mode: ${mode}`);
    }
    reset();
    activeMode = mode;
    isPlaying = true;
    clock.start();
    clock.getDelta();
    resize();
    renderFrame(0);
  }

  function destroy() {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    ro.disconnect();
    clock.stop();
    renderer.dispose();
    container.innerHTML = "";
  }

  reset();
  rafId = requestAnimationFrame(loop);

  return { play, reset, destroy };
}
