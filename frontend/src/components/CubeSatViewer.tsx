import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface CubeSatViewerProps {
  theme?: 'light' | 'dark';
}

export const CubeSatViewer: React.FC<CubeSatViewerProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const reqAnimationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera (focused, natural perspective)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0.4, 3.6);
    cameraRef.current = camera;

    // 3. Renderer with transparent background and ACESFilmic tone mapping
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // 4. Orbit Controls (seamless rotation, interaction without page hijack)
    const controls = new OrbitControls(camera, canvasRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 6.0;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Prevent wheel scrolling on canvas from moving the parent page
    const canvasElement = canvasRef.current;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    // 5. Lighting suitable for a metallic satellite
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 1.0);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    // 6. Group Container
    const group = new THREE.Group();
    // Slight tilt for dynamic look
    group.rotation.z = THREE.MathUtils.degToRad(15);
    group.rotation.x = THREE.MathUtils.degToRad(10);
    scene.add(group);
    meshGroupRef.current = group;

    // 7. Load GLB Model from public folder
    const loader = new GLTFLoader();
    
    // Force standard TextureLoader to bypass iframe blob: fetch restrictions
    const originalParse = loader.parse;
    loader.parse = function(data: any, path: string, onLoad: (gltf: any) => void, onError: (err: any) => void) {
      const _createImageBitmap = window.createImageBitmap;
      (window as any).createImageBitmap = undefined;
      try {
        originalParse.call(this, data, path, onLoad, onError);
      } finally {
        (window as any).createImageBitmap = _createImageBitmap;
      }
    };
    
    // Add DRACOLoader in case the model is compressed
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    // KTX2 and Meshopt
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.185.1/examples/jsm/libs/basis/');
    ktx2Loader.detectSupport(renderer);
    loader.setKTX2Loader(ktx2Loader);

    loader.setMeshoptDecoder(MeshoptDecoder);

    const modelUrl = '/models/cubesat-1RU.glb';

    loader.load(
      modelUrl,
      (gltf) => {
        const root = gltf.scene;
        
        // Normalize bounding box scale
        const bbox = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        // Scale appropriately to fit view
        const targetScale = 2.0 / (maxDim || 1);
        root.scale.set(targetScale, targetScale, targetScale);

        // Center model
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        root.position.x = -center.x * targetScale;
        root.position.y = -center.y * targetScale;
        root.position.z = -center.z * targetScale;

        group.add(root);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('GLB loading error:', err);
        setLoadError(err instanceof Error ? err.message : String(err));
        // Fallback cube if loading fails
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        setIsLoading(false);
      }
    );

    // 8. Smooth Animation Loop
    let isVisible = true;
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
      });
    }, { threshold: 0 });
    visibilityObserver.observe(containerRef.current);

    const animate = () => {
      reqAnimationIdRef.current = requestAnimationFrame(animate);

      if (!isVisible) return; // Pause heavy WebGL rendering when off-screen

      if (meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.002;
      }

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 10. Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      visibilityObserver.disconnect();
      canvasElement.removeEventListener('wheel', handleWheel);
      resizeObserver.disconnect();
      if (reqAnimationIdRef.current) {
        cancelAnimationFrame(reqAnimationIdRef.current);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden pointer-events-auto touch-none overscroll-contain select-none"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing block touch-none overscroll-contain select-none" 
      />

      {/* Subtle loader if GLB is downloading */}
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="absolute bottom-2 left-2 right-2 p-2 bg-[#DC143C]/10 border border-[#DC143C]/30 text-[#DC143C] text-xs font-mono break-words rounded backdrop-blur-sm pointer-events-auto">
          Failed to load model: {loadError}
        </div>
      )}
    </div>
  );
};
