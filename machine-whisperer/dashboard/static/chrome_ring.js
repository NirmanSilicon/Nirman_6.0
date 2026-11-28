/**
 * MACHINE WHISPERER — 3D REFLECTIVE CHROME RING BACKGROUND
 * Real-time Three.js WebGL Simulation · Liquid-Metal Iridescent Reflections
 * 100% Offline-Ready · High-Performance GPU Optimization (DPR 1.5, Visibility Pause)
 */

(() => {
  "use strict";

  // Check WebGL availability
  const canvas = document.getElementById("chrome-ring-canvas");
  if (!canvas || typeof THREE === "undefined") {
    console.warn("[ChromeRing] Canvas or Three.js unavailable.");
    return;
  }

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scene, Camera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      precision: "mediump", // High-efficiency fragment precision for mobile & integrated GPUs
      depth: true,
      stencil: false,
    });
    // Cap pixel ratio to 1.5 to eliminate 4x fragment shader fillrate spikes on 4K/Retina
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
  } catch (err) {
    console.error("[ChromeRing] WebGL initialization failed:", err);
    return;
  }

  // ==========================================================================
  // PROCEDURAL IRIDESCENT LIQUID-METAL ENVIRONMENT MAP (100% Offline)
  // Generates studio lighting reflections: Silver, Electric Blue, Cyan, Lavender
  // ==========================================================================
  function createIridescentChromeEnv() {
    const envCanvas = document.createElement("canvas");
    envCanvas.width = 1024;
    envCanvas.height = 512;
    const ctx = envCanvas.getContext("2d");

    // Deep graphite & midnight base
    const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
    baseGrad.addColorStop(0.0, "#0a0f18");
    baseGrad.addColorStop(0.25, "#141d2a");
    baseGrad.addColorStop(0.5, "#202A36");
    baseGrad.addColorStop(0.75, "#101722");
    baseGrad.addColorStop(1.0, "#080c14");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // High-intensity Silver Key Reflection Streak
    const silverStreak = ctx.createLinearGradient(0, 190, 0, 250);
    silverStreak.addColorStop(0, "rgba(255, 255, 255, 0)");
    silverStreak.addColorStop(0.5, "rgba(255, 255, 255, 0.98)");
    silverStreak.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = silverStreak;
    ctx.fillRect(0, 190, 1024, 60);

    // Secondary Rim Streak
    const rimStreak = ctx.createLinearGradient(0, 310, 0, 350);
    rimStreak.addColorStop(0, "rgba(255, 255, 255, 0)");
    rimStreak.addColorStop(0.5, "rgba(235, 245, 255, 0.75)");
    rimStreak.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rimStreak;
    ctx.fillRect(0, 310, 1024, 40);

    // Electric Blue Iridescent Reflection Zone (#78B7F5)
    const blueZone = ctx.createRadialGradient(280, 220, 20, 280, 220, 280);
    blueZone.addColorStop(0.0, "rgba(120, 183, 245, 0.95)");
    blueZone.addColorStop(0.4, "rgba(120, 183, 245, 0.65)");
    blueZone.addColorStop(0.8, "rgba(101, 140, 203, 0.25)");
    blueZone.addColorStop(1.0, "rgba(101, 140, 203, 0)");
    ctx.fillStyle = blueZone;
    ctx.fillRect(0, 40, 600, 380);

    // Luminous Cyan Reflection Flare (#8BE2E8)
    const cyanFlare = ctx.createRadialGradient(180, 280, 10, 180, 280, 220);
    cyanFlare.addColorStop(0.0, "rgba(139, 226, 232, 0.95)");
    cyanFlare.addColorStop(0.5, "rgba(139, 226, 232, 0.40)");
    cyanFlare.addColorStop(1.0, "rgba(139, 226, 232, 0)");
    ctx.fillStyle = cyanFlare;
    ctx.fillRect(0, 120, 460, 300);

    // Subtle Violet / Lavender Reflection Zone (#B9B9F0)
    const violetZone = ctx.createRadialGradient(780, 210, 20, 780, 210, 300);
    violetZone.addColorStop(0.0, "rgba(185, 185, 240, 0.95)");
    violetZone.addColorStop(0.4, "rgba(185, 185, 240, 0.60)");
    violetZone.addColorStop(0.8, "rgba(130, 130, 220, 0.20)");
    violetZone.addColorStop(1.0, "rgba(130, 130, 220, 0)");
    ctx.fillStyle = violetZone;
    ctx.fillRect(480, 40, 544, 380);

    // Overhead Studio Softbox Light
    const topSoftbox = ctx.createLinearGradient(0, 0, 0, 140);
    topSoftbox.addColorStop(0.0, "rgba(255, 255, 255, 0.55)");
    topSoftbox.addColorStop(0.7, "rgba(220, 235, 255, 0.20)");
    topSoftbox.addColorStop(1.0, "rgba(220, 235, 255, 0)");
    ctx.fillStyle = topSoftbox;
    ctx.fillRect(0, 0, 1024, 140);

    const texture = new THREE.CanvasTexture(envCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const envMap = createIridescentChromeEnv();
  scene.environment = envMap;

  // ==========================================================================
  // 3D CHROME RING GEOMETRY & LIQUID-METAL MATERIAL (GPU-Optimized)
  // 32x80 segments provides smooth curves while reducing polygon count by 75%
  // MeshStandardMaterial delivers metallic liquid sheen with low shader overhead
  // ==========================================================================
  const ringGeometry = new THREE.TorusGeometry(5.6, 1.05, 32, 80);

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#dbe7f5"),
    metalness: 0.96,
    roughness: 0.12,
    envMap: envMap,
    envMapIntensity: 2.2,
  });

  const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.rotation.x = 0.62;
  ringMesh.rotation.y = 0.38;
  ringMesh.rotation.z = -0.15;
  scene.add(ringMesh);

  // Secondary orbital accent ring (16x48 segments)
  const innerGeometry = new THREE.TorusGeometry(3.7, 0.08, 16, 48);
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#8BE2E8"),
    metalness: 0.88,
    roughness: 0.18,
    envMap: envMap,
    envMapIntensity: 2.5,
  });
  const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
  innerMesh.rotation.x = -0.45;
  innerMesh.rotation.y = 0.55;
  scene.add(innerMesh);

  // ==========================================================================
  // CINEMATIC DIRECTIONAL LIGHTING SUITE
  // Directional lights avoid per-fragment quadratic distance calculations
  // ==========================================================================
  const ambientLight = new THREE.AmbientLight(0x202A36, 1.8);
  scene.add(ambientLight);

  // Key Studio Directional Light (Warm Silver)
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(6, 9, 8);
  scene.add(keyLight);

  // Electric Blue Rim Light (#78B7F5)
  const blueRim = new THREE.DirectionalLight(0x78B7F5, 2.8);
  blueRim.position.set(-8, -5, 5);
  scene.add(blueRim);

  // Luminous Cyan Fill Light (#8BE2E8)
  const cyanFill = new THREE.DirectionalLight(0x8BE2E8, 2.2);
  cyanFill.position.set(8, -6, 4);
  scene.add(cyanFill);

  // Subtle Violet Accent Light (#B9B9F0)
  const violetAccent = new THREE.DirectionalLight(0xB9B9F0, 2.2);
  violetAccent.position.set(0, 8, -5);
  scene.add(violetAccent);

  // ==========================================================================
  // CURSOR-RESPONSIVE PARALLAX & CONTINUOUS MOTION
  // ==========================================================================
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  window.addEventListener("mousemove", (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Handle window resizing cleanly with RAF debouncing
  let resizeTimeout = null;
  function onWindowResize() {
    if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
    resizeTimeout = requestAnimationFrame(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;

      if (width < 768) {
        camera.position.z = 18;
      } else if (width < 1200) {
        camera.position.z = 15;
      } else {
        camera.position.z = 13.5;
      }

      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    });
  }
  window.addEventListener("resize", onWindowResize, { passive: true });
  onWindowResize();

  // Visibility Pause (GPU-Friendly - halts animation loop when tab is hidden)
  let isSceneVisible = !document.hidden;
  let animationId = null;

  function startAnimation() {
    if (!animationId && isSceneVisible) {
      animationId = requestAnimationFrame(animate);
    }
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    isSceneVisible = !document.hidden;
    if (isSceneVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });

  // WebGL Context Management
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stopAnimation();
  }, false);

  canvas.addEventListener("webglcontextrestored", () => {
    startAnimation();
  }, false);

  // Base rotation anchors
  let baseRotX = 0.62;
  let baseRotY = 0.38;
  let baseRotZ = -0.15;

  // Animation Loop (60 FPS fluid lerp)
  function animate() {
    animationId = null;

    if (!isSceneVisible) return;

    if (!prefersReducedMotion) {
      // Continuous graceful rotation
      baseRotX += 0.0016;
      baseRotY += 0.0024;
      baseRotZ += 0.0008;

      // Mouse Parallax Smooth Lerp
      mouseX += (targetMouseX - mouseX) * 0.045;
      mouseY += (targetMouseY - mouseY) * 0.045;

      ringMesh.rotation.x = baseRotX + mouseY * 0.22;
      ringMesh.rotation.y = baseRotY + mouseX * 0.28;
      ringMesh.rotation.z = baseRotZ;

      // Counter-rotation on secondary inner ring for visual depth
      innerMesh.rotation.x = -baseRotX * 0.7 - mouseY * 0.15;
      innerMesh.rotation.y = baseRotY * 0.8 + mouseX * 0.18;
    }

    renderer.render(scene, camera);

    if (isSceneVisible) {
      animationId = requestAnimationFrame(animate);
    }
  }

  startAnimation();
})();
