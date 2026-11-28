import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Sparkles,
  Upload,
  RefreshCw,
  AlertTriangle,
  ScanLine,
  SlidersHorizontal,
  Award,
  SwitchCamera,
  Zap,
} from 'lucide-react';
import {
  ItemCondition,
  ScanPrediction,
  WasteItemProfile,
} from '../types/eco';
import {
  CATEGORY_LIST,
  WASTE_CATEGORIES,
  WASTE_ITEMS,
  calculateFourFactorScore,
  resolveEffectiveCategory,
} from '../data/wasteDatabase';
import {
  TrainedWasteHeadArtifact,
  buildSamplePrediction,
  classifyElementWithAI,
  loadVisionModel,
} from '../utils/visionClassifier';
import { reportError } from '../utils/errorTracker';
import LatticeLoader from './LatticeLoader';
import AnimatedContent from './AnimatedContent';
import SpecularButton from './SpecularButton';

interface ScannerStudioProps {
  prediction: ScanPrediction | null;
  onPredictionChange: (pred: ScanPrediction) => void;
  onOpenVerifyModal: () => void;
}

export const ScannerStudio: React.FC<ScannerStudioProps> = ({
  prediction,
  onPredictionChange,
  onOpenVerifyModal,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<'camera' | 'upload' | 'samples'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [autoLiveScan, setAutoLiveScan] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [trainedArtifact, setTrainedArtifact] = useState<TrainedWasteHeadArtifact | null>(null);
  const [condition, setCondition] = useState<ItemCondition>('clean');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadVisionModel().then(({ model, artifact }) => {
      if (!mounted) return;
      setModelStatus(model ? 'ready' : 'fallback');
      setTrainedArtifact(artifact);
    });
    return () => {
      mounted = false;
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setAutoLiveScan(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async (requestedFacing = facingMode) => {
    setCameraError(null);
    stopCamera();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live camera API is unavailable in this browser context. Try Upload Photo or Quick Samples.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: requestedFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Camera access was denied or no webcam was detected.';
      reportError({
        source: 'camera.getUserMedia',
        severity: 'warning',
        message: msg,
        error: err,
      });
      setCameraError(
        `Camera unavailable (${msg}). Allow camera permissions or switch to Upload / Quick Samples.`
      );
    }
  };

  const captureAndScanCamera = async () => {
    if (!videoRef.current || !cameraActive || isScanning) return;
    setIsScanning(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const result = await classifyElementWithAI(
        ctx ? canvas : video,
        condition,
        'camera-ai'
      );
      onPredictionChange(result);
    } finally {
      setIsScanning(false);
    }
  };

  const captureFnRef = useRef(captureAndScanCamera);
  captureFnRef.current = captureAndScanCamera;

  // Continuous live camera scanning loop when Auto-Scan Live is toggled on
  useEffect(() => {
    if (!autoLiveScan || !cameraActive) return;
    const timer = window.setInterval(() => {
      captureFnRef.current();
    }, 2400);
    return () => window.clearInterval(timer);
  }, [autoLiveScan, cameraActive]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    previewObjectUrlRef.current = url;
    setPreviewDataUrl(url);
    const img = new Image();
    img.onload = async () => {
      setIsScanning(true);
      try {
        const result = await classifyElementWithAI(img, condition, 'upload-ai');
        onPredictionChange(result);
      } finally {
        setIsScanning(false);
      }
    };
    img.src = url;
  };

  const handleSampleSelect = (item: WasteItemProfile) => {
    setPreviewDataUrl(null);
    const pred = buildSamplePrediction(item, condition);
    onPredictionChange(pred);
  };

  const handleConditionChange = (nextCond: ItemCondition) => {
    setCondition(nextCond);
    if (!prediction) return;
    const effectiveCategory = resolveEffectiveCategory(prediction.item, nextCond);
    const { score, adjusted } = calculateFourFactorScore(prediction.item.fourFactor, nextCond);
    onPredictionChange({
      ...prediction,
      condition: nextCond,
      effectiveCategory,
      effectiveScore: score,
      effectiveFactors: adjusted,
    });
  };

  const handleManualOverride = (item: WasteItemProfile) => {
    const effectiveCategory = resolveEffectiveCategory(item, condition);
    const { score, adjusted } = calculateFourFactorScore(item.fourFactor, condition);
    onPredictionChange({
      item,
      confidence: 100,
      rawLabel: `${item.name} (User Confirmed)`,
      source: 'manual',
      condition,
      effectiveCategory,
      effectiveScore: score,
      effectiveFactors: adjusted,
      alternativeMatches: [],
      timestamp: Date.now(),
    });
  };

  const activeCategoryMeta = prediction
    ? WASTE_CATEGORIES[prediction.effectiveCategory]
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Live Camera / Upload / Samples Panel */}
      <AnimatedContent
        distance={80}
        direction="vertical"
        duration={0.8}
        ease="power3.out"
        blur={0}
        stagger={0.08}
        threshold={0.1}
        className="lg:col-span-6"
      >
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-900 text-base sm:text-lg leading-tight">
                AI Waste Vision Scanner
              </h2>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                {modelStatus === 'loading' ? (
                  <LatticeLoader
                    status="working"
                    label="Loading AI model"
                    doneLabel="Model ready in"
                    errorLabel="Fallback after"
                    pattern="orbit"
                    grid={3}
                    shape="round"
                    doneColor="#22c55e"
                    errorColor="#ef4444"
                    cellSize={5}
                    gap={2}
                    fontSize={12}
                    step={90}
                    idleOpacity={0.15}
                    glow={false}
                    glowColor=""
                    showTimer
                  />
                ) : (
                  <>
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        modelStatus === 'ready' ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                    />
                    {modelStatus === 'ready'
                      ? trainedArtifact
                        ? `Trained on TrashNet + TACO + RealWaste + Kaggle (${trainedArtifact.metrics.validationAccuracyPct}% val acc)`
                        : 'TensorFlow.js MobileNet Ready (On-Device)'
                      : 'Smart Visual Signature Engine Active'}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('camera');
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                mode === 'camera'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Camera
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setMode('samples');
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                mode === 'samples'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Test
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="p-4 sm:p-5 space-y-4">
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl bg-slate-950 overflow-hidden aspect-[4/3] flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {!cameraActive && (
                  <div className="text-center px-6 py-8 max-w-sm">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h3 className="text-white font-semibold text-base mb-1">
                      Point Camera at Any Waste Item
                    </h3>
                    <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                      Real-time computer vision classifies your item into Biodegradable, Non-Biodegradable, Recyclable, Non-Recyclable, E-Waste, or Hazardous Waste.
                    </p>
                    <SpecularButton
                      size="lg"
                      radius={18}
                      tint="#ffffff"
                      tintOpacity={0.08}
                      textColor="#f5f5f5"
                      lineColor="#ffffff"
                      baseColor="#525252"
                      surfaceColor="#059669"
                      intensity={1}
                      idleIntensity={0.35}
                      shineSize={10}
                      shineFade={34}
                      thickness={1.2}
                      glow={1}
                      followMouse
                      proximity={250}
                      onClick={() => startCamera()}
                    >
                      <Camera className="w-4 h-4" />
                      Start Live Camera
                    </SpecularButton>
                    {cameraError && (
                      <p className="mt-3 text-xs text-amber-300 bg-amber-950/60 border border-amber-700/50 rounded-xl p-2.5">
                        {cameraError}
                      </p>
                    )}
                  </div>
                )}

                {cameraActive && (
                  <>
                    {/* HUD Viewfinder Corners */}
                    <div className="pointer-events-none absolute inset-4 border border-white/15 rounded-xl">
                      <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                      {(isScanning || autoLiveScan) && (
                        <div className="absolute inset-x-2 top-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanline" />
                      )}
                    </div>

                    {/* Top Live Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/75 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
                      {isScanning ? (
                        <LatticeLoader
                          status="working"
                          label="Analyzing"
                          doneLabel="Done in"
                          errorLabel="Failed after"
                          pattern="orbit"
                          grid={3}
                          shape="round"
                          color="#34d399"
                          doneColor="#22c55e"
                          errorColor="#ef4444"
                          cellSize={5}
                          gap={2}
                          fontSize={12}
                          step={90}
                          idleOpacity={0.15}
                          glow={false}
                          glowColor=""
                          showTimer
                        />
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          {autoLiveScan ? 'LIVE AUTO-SCANNING' : 'CAMERA READY'}
                        </>
                      )}
                    </div>

                    <SpecularButton
                      size="xs"
                      radius={18}
                      tint="#ffffff"
                      tintOpacity={0.04}
                      textColor="#f5f5f5"
                      lineColor="#ffffff"
                      baseColor="#525252"
                      surfaceColor="#09090b"
                      intensity={1}
                      idleIntensity={0.35}
                      shineSize={10}
                      shineFade={34}
                      thickness={1.2}
                      glow={1}
                      followMouse
                      proximity={250}
                      onClick={() => {
                        const next = facingMode === 'environment' ? 'user' : 'environment';
                        setFacingMode(next);
                        startCamera(next);
                      }}
                      title="Switch Camera"
                      className="!absolute top-3 right-3"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </SpecularButton>

                    {prediction && (
                      <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-md rounded-xl p-2.5 border border-white/15 flex items-center justify-between gap-2 text-white">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl">{prediction.item.emoji}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{prediction.item.name}</p>
                            <p className="text-[11px] text-emerald-300">
                              {WASTE_CATEGORIES[prediction.effectiveCategory].binName} · {prediction.confidence}% match
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/15">
                          Score {prediction.effectiveScore}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {cameraActive && (
                <div className="flex flex-wrap items-center gap-2">
                  <SpecularButton
                    size="md"
                    radius={18}
                    tint="#ffffff"
                    tintOpacity={0.06}
                    textColor="#f5f5f5"
                    lineColor="#ffffff"
                    baseColor="#525252"
                    surfaceColor="#059669"
                    intensity={1}
                    idleIntensity={0.35}
                    shineSize={10}
                    shineFade={34}
                    thickness={1.2}
                    glow={1}
                    followMouse
                    proximity={250}
                    onClick={captureAndScanCamera}
                    disabled={isScanning}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isScanning ? 'Analyzing Frame...' : 'Capture & Classify'}
                  </SpecularButton>

                  <SpecularButton
                    size="md"
                    radius={18}
                    tint="#ffffff"
                    tintOpacity={0.04}
                    textColor="#f5f5f5"
                    lineColor="#ffffff"
                    baseColor="#525252"
                    surfaceColor={autoLiveScan ? '#b45309' : '#27272a'}
                    intensity={1}
                    idleIntensity={0.35}
                    shineSize={10}
                    shineFade={34}
                    thickness={1.2}
                    glow={1}
                    followMouse
                    proximity={250}
                    onClick={() => setAutoLiveScan((v) => !v)}
                  >
                    <Zap className="w-4 h-4" />
                    {autoLiveScan ? 'Auto-Scan On' : 'Auto-Scan'}
                  </SpecularButton>

                  <SpecularButton
                    size="md"
                    radius={18}
                    tint="#ffffff"
                    tintOpacity={0.04}
                    textColor="#f5f5f5"
                    lineColor="#ffffff"
                    baseColor="#525252"
                    surfaceColor="#3f3f46"
                    intensity={1}
                    idleIntensity={0.35}
                    shineSize={10}
                    shineFade={34}
                    thickness={1.2}
                    glow={1}
                    followMouse
                    proximity={250}
                    onClick={stopCamera}
                  >
                    <CameraOff className="w-4 h-4" />
                    Stop
                  </SpecularButton>
                </div>
              )}
            </div>
          )}

          {mode === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/70 hover:bg-emerald-50/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {previewDataUrl ? (
                  <div className="space-y-3">
                    <img
                      src={previewDataUrl}
                      alt="Uploaded waste preview"
                      className="max-h-60 mx-auto rounded-xl object-contain shadow-sm"
                    />
                    <div className="flex justify-center">
                      {isScanning ? (
                        <LatticeLoader
                          status="working"
                          label="Classifying waste"
                          doneLabel="Done in"
                          errorLabel="Failed after"
                          pattern="orbit"
                          grid={3}
                          shape="round"
                          doneColor="#22c55e"
                          errorColor="#ef4444"
                          cellSize={6}
                          gap={2}
                          fontSize={14}
                          step={90}
                          idleOpacity={0.15}
                          glow={false}
                          glowColor=""
                          showTimer
                          className="text-emerald-700"
                        />
                      ) : (
                        <p className="text-xs font-medium text-emerald-700">
                          Click to upload a different waste photo
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">
                      Upload Waste Item Photo
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports JPG, PNG, WebP — analyzed directly in your browser
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'samples' && (
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Tap any prototype item below to run EcoPulse’s 4-factor scoring & bin routing pipeline:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WASTE_ITEMS.map((item) => {
                  const cat = WASTE_CATEGORIES[item.primaryCategory];
                  const isSelected = prediction?.item.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSampleSelect(item)}
                      className={`text-left p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">{item.emoji}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.hex }}
                          title={cat.label}
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {item.name}
                      </p>
                      <p className="text-[10px] font-semibold mt-1" style={{ color: cat.hex }}>
                        {cat.shortLabel}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Condition Selector (PPT Mitigation for dirty/occluded/damaged items) */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                Item Condition Check (PPT Contamination Guard)
              </span>
              <span className="text-[11px] text-slate-500">Affects score &amp; bin</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'clean', label: 'Clean & Dry' },
                  { id: 'soiled', label: 'Food-Soiled / Wet' },
                  { id: 'damaged', label: 'Damaged / Swollen' },
                ] as const
              ).map((opt) => (
                <SpecularButton
                  key={opt.id}
                  size="sm"
                  radius={14}
                  tint="#ffffff"
                  tintOpacity={condition === opt.id ? 0.08 : 0.02}
                  textColor={condition === opt.id ? '#ffffff' : '#334155'}
                  lineColor={condition === opt.id ? '#ffffff' : '#94a3b8'}
                  baseColor={condition === opt.id ? '#059669' : '#cbd5e1'}
                  surfaceColor={condition === opt.id ? '#059669' : '#ffffff'}
                  intensity={1}
                  idleIntensity={0.35}
                  shineSize={10}
                  shineFade={34}
                  thickness={1.2}
                  glow={condition === opt.id ? 1 : 0.35}
                  followMouse
                  proximity={250}
                  fullWidth
                  onClick={() => handleConditionChange(opt.id)}
                >
                  {opt.label}
                </SpecularButton>
              ))}
            </div>
          </div>
        </div>
      </div>
      </AnimatedContent>

      {/* Right: AI Result, 6-Category Badge, 4-Factor Waste Score & Bin Guidance */}
      <AnimatedContent
        distance={80}
        direction="vertical"
        duration={0.8}
        ease="power3.out"
        blur={0}
        stagger={0.08}
        threshold={0.1}
        delay={0.08}
        className="lg:col-span-6 space-y-5"
      >
        {!prediction || !activeCategoryMeta ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900">
              Ready to Scan &amp; Segregate
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Start the live camera, upload an image, or pick a quick test sample to see the 6-category waste classification, 4-factor Waste Score, and recommended disposal bin.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {WASTE_ITEMS.slice(0, 4).map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSampleSelect(sample)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 text-xs font-semibold transition cursor-pointer"
                >
                  <span>{sample.emoji}</span>
                  <span>Try {sample.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Bin Instruction Banner */}
            <div
              className="p-5 text-white relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${activeCategoryMeta.hex} 0%, #0f172a 140%)`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recommended Disposal Bin
                  </span>
                  <h3 className="font-display font-extrabold text-2xl mt-2">
                    Throw in: {activeCategoryMeta.binName}
                  </h3>
                  <p className="text-white/90 text-xs mt-1">
                    Primary Class: <strong>{activeCategoryMeta.label}</strong> · Detected:{' '}
                    <strong>{prediction.item.name}</strong> ({prediction.confidence}% confidence)
                  </p>
                </div>
                <div className="text-4xl bg-white/15 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                  {prediction.item.emoji}
                </div>
              </div>

              {/* All applicable 6-category pills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {CATEGORY_LIST.map((cat) => {
                  const isPrimary = cat.id === prediction.effectiveCategory;
                  const isApplicable =
                    isPrimary || prediction.item.applicableCategories.includes(cat.id);
                  return (
                    <span
                      key={cat.id}
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        isPrimary
                          ? 'bg-white text-slate-900 border-white shadow-xs'
                          : isApplicable
                            ? 'bg-white/20 text-white border-white/30'
                            : 'bg-black/15 text-white/45 border-white/10'
                      }`}
                    >
                      {isPrimary ? '● ' : ''}
                      {cat.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Condition override alert */}
              {prediction.condition === 'soiled' && prediction.item.soilNote && (
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Condition Rule Applied: </span>
                    {prediction.item.soilNote}
                  </div>
                </div>
              )}

              {/* Material & Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">Material Class</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {prediction.item.materialClass}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">Resin / Code</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {prediction.item.resinOrCode}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">Decomposition</p>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {prediction.item.decompositionTime}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-medium">Hazard Level</p>
                  <p
                    className={`text-xs font-bold mt-0.5 ${
                      prediction.item.hazardLabel === 'Critical' ||
                      prediction.item.hazardLabel === 'High'
                        ? 'text-red-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {prediction.item.hazardLabel}
                  </p>
                </div>
              </div>

              {/* 4-Factor Waste Score */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-900">
                      4-Factor Waste Impact Score
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Weighted circularity index (Recyclability, Biodegradability, Speed, Safety)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-extrabold text-2xl text-emerald-600">
                      {prediction.effectiveScore}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/100</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Recyclability',
                      val: prediction.effectiveFactors.recyclability,
                      color: 'bg-blue-600',
                    },
                    {
                      label: 'Biodegradability',
                      val: prediction.effectiveFactors.biodegradability,
                      color: 'bg-emerald-600',
                    },
                    {
                      label: 'Decomposition Speed',
                      val: prediction.effectiveFactors.decompositionSpeed,
                      color: 'bg-teal-500',
                    },
                    {
                      label: 'Hazard Safety',
                      val: prediction.effectiveFactors.hazardSafety,
                      color: 'bg-violet-600',
                    },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{f.label}</span>
                        <span className="font-bold text-slate-900">{f.val}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.color} transition-all duration-500`}
                          style={{ width: `${f.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Prep Steps */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Before You Toss
                </p>
                <ul className="space-y-1.5">
                  {prediction.item.prepSteps.map((step, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-500 pt-1">
                  <strong>Contamination Note:</strong> {prediction.item.contaminationWarning}
                </p>
              </div>

              {/* Confidence Mitigation: User Confirmation Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Wrong item detected? Confirm manually:
                </span>
                <select
                  aria-label="Manual item correction"
                  value={prediction.item.id}
                  onChange={(e) => {
                    const found = WASTE_ITEMS.find((w) => w.id === e.target.value);
                    if (found) handleManualOverride(found);
                  }}
                  className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
                >
                  {WASTE_ITEMS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.emoji} {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary CTA Button: Verify Disposal for Points */}
              <div className="pt-1">
                <SpecularButton
                  size="lg"
                  radius={18}
                  tint="#ffffff"
                  tintOpacity={0.06}
                  textColor="#f5f5f5"
                  lineColor="#ffffff"
                  baseColor="#525252"
                  surfaceColor="#059669"
                  intensity={1}
                  idleIntensity={0.35}
                  shineSize={10}
                  shineFade={34}
                  thickness={1.2}
                  glow={1}
                  followMouse
                  proximity={250}
                  fullWidth
                  onClick={onOpenVerifyModal}
                >
                  <Award className="w-4 h-4" />
                  I Threw It — Claim +{prediction.item.basePoints} Pts
                </SpecularButton>
              </div>
            </div>
          </div>
        )}
      </AnimatedContent>
    </div>
  );
};
