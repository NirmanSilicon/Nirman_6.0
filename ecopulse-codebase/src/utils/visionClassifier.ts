import {
  ItemCondition,
  ScanPrediction,
  WasteItemProfile,
} from '../types/eco';
import {
  WASTE_ITEMS,
  calculateFourFactorScore,
  resolveEffectiveCategory,
} from '../data/wasteDatabase';

export interface TrainedWasteHeadArtifact {
  modelName: string;
  version: string;
  trainedAt: string;
  backbone: string;
  embeddingDim: number;
  hiddenUnits: number;
  classes: string[];
  datasets: string[];
  sampleCounts: {
    train: number;
    validation: number;
    bySource: Record<string, number>;
    byClass: Record<string, number>;
  };
  metrics: {
    validationAccuracyPct: number;
    finalTrainAccuracyPct: number;
    perClassValAccuracyPct: Record<string, number | null>;
  };
  weights: Array<{ shape: number[]; data: number[] }>;
}

type MobileNetModel = {
  classify: (
    img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    topk?: number
  ) => Promise<Array<{ className: string; probability: number }>>;
  infer: (
    img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    embedding?: boolean
  ) => unknown;
  normalizationConstant?: number;
  inputMin?: number;
  model?: {
    outputNodes?: string[];
    execute: (input: unknown, outputs: string[]) => unknown;
  };
};

const MOBILENET_IMAGE_SIZE = 224;
const MOBILENET_V2_EMBEDDING_NODE = 'module_apply_default/MobilenetV2/Logits/AvgPool';
const GEMINI_MAX_EDGE_PX = 384;
const GEMINI_CLIENT_TIMEOUT_MS = 5500;

let cachedModel: MobileNetModel | null = null;
let cachedArtifact: TrainedWasteHeadArtifact | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedHead: any = null;
let cachedImagenetClasses: Record<number, string> | null = null;
let geminiConfigured = true;
let geminiCanvas: HTMLCanvasElement | null = null;
let mobilenetCanvas: HTMLCanvasElement | null = null;
let modelLoadPromise: Promise<{
  model: MobileNetModel | null;
  artifact: TrainedWasteHeadArtifact | null;
}> | null = null;

export function getLoadedModelArtifact(): TrainedWasteHeadArtifact | null {
  return cachedArtifact;
}

export async function loadVisionModel(): Promise<{
  model: MobileNetModel | null;
  artifact: TrainedWasteHeadArtifact | null;
}> {
  if (cachedModel) return { model: cachedModel, artifact: cachedArtifact };
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      const [tf, mobilenet, imagenetMod] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/mobilenet'),
        import('@tensorflow-models/mobilenet/dist/imagenet_classes').catch(() => null),
      ]);
      if (imagenetMod && 'IMAGENET_CLASSES' in imagenetMod) {
        cachedImagenetClasses = imagenetMod.IMAGENET_CLASSES as Record<number, string>;
      }
      await tf.ready();
      const [model, headResp] = await Promise.all([
        mobilenet.load({ version: 2, alpha: 0.5 }) as unknown as Promise<MobileNetModel>,
        fetch('/models/ecopulse-waste-head.json').catch(() => null),
      ]);
      cachedModel = model;

      if (headResp?.ok) {
        try {
          const artifact = (await headResp.json()) as TrainedWasteHeadArtifact;
          const head = tf.sequential();
          head.add(
            tf.layers.dense({
              inputShape: [artifact.embeddingDim],
              units: artifact.hiddenUnits,
              activation: 'relu',
            })
          );
          head.add(
            tf.layers.dense({
              units: artifact.classes.length,
              activation: 'softmax',
            })
          );
          const weightTensors = artifact.weights.map((w) => tf.tensor(w.data, w.shape));
          head.setWeights(weightTensors);
          weightTensors.forEach((t) => t.dispose());

          // Pre-warm the dense classification head shaders during load rather than first scan
          const warmOut = tf.tidy(() =>
            head.predict(tf.zeros([1, artifact.embeddingDim]))
          ) as { data: () => Promise<Float32Array>; dispose: () => void };
          await warmOut.data();
          warmOut.dispose();

          cachedHead = head;
          cachedArtifact = artifact;
        } catch (headErr) {
          console.warn('Trained waste head load skipped:', headErr);
        }
      }

      return { model, artifact: cachedArtifact };
    } catch (err) {
      console.warn('MobileNet preload unavailable, falling back to color/heuristic analyzer:', err);
      return { model: null, artifact: null };
    }
  })();

  return modelLoadPromise;
}

const TRAINED_CLASS_TO_ITEM_ID: Record<string, string> = {
  organic: 'banana-peel',
  cardboard: 'paper-cardboard',
  paper: 'paper-cardboard',
  plastic: 'pet-bottle',
  glass: 'glass-bottle',
  metal: 'aluminum-can',
  textile: 'textile-fabric',
  non_recyclable: 'chip-wrapper-laminate',
  hazardous_ewaste: 'li-ion-battery',
};

function scoreKeywordMatch(rawLabel: string, item: WasteItemProfile): number {
  const normalized = rawLabel.toLowerCase();
  const tokens = normalized.split(/[\s,/_-]+/).filter(Boolean);
  let score = 0;

  for (const kw of item.keywords) {
    if (normalized.includes(kw)) {
      score += kw.includes(' ') ? 3.5 : 2.2;
    } else {
      for (const t of tokens) {
        if (t.length > 2 && (kw.includes(t) || t.includes(kw))) {
          score += 1.0;
        }
      }
    }
  }
  return score;
}

export function mapRawLabelsToWaste(
  predictions: Array<{ className: string; probability: number }>,
  condition: ItemCondition,
  source: ScanPrediction['source'],
  trainedHeadPredictions?: Array<{ cls: string; probability: number }>
): ScanPrediction {
  const scoredById = new Map<string, { item: WasteItemProfile; score: number; rawLabel: string }>();

  // 1. Score from trained TrashNet + RealWaste + TACO transfer-learning head (primary material signal)
  if (trainedHeadPredictions && trainedHeadPredictions.length > 0) {
    for (const tp of trainedHeadPredictions) {
      const targetId = TRAINED_CLASS_TO_ITEM_ID[tp.cls];
      const item = WASTE_ITEMS.find((w) => w.id === targetId);
      if (!item) continue;
      const weighted = tp.probability * 5.0;
      const existing = scoredById.get(item.id);
      if (!existing || weighted > existing.score) {
        scoredById.set(item.id, {
          item,
          score: weighted,
          rawLabel: `${tp.cls} (${Math.round(tp.probability * 100)}% TrashNet/TACO/RealWaste)`,
        });
      }
    }
  }

  // 2. Refine with MobileNet semantic object labels (captures fine items like banana, smartphone, battery, spray)
  for (const pred of predictions) {
    for (const item of WASTE_ITEMS) {
      const kwScore = scoreKeywordMatch(pred.className, item);
      if (kwScore > 0) {
        const boost =
          item.primaryCategory === 'e-waste' || item.primaryCategory === 'hazardous'
            ? kwScore * (0.8 + pred.probability * 1.8)
            : kwScore * (0.45 + pred.probability);
        const existing = scoredById.get(item.id);
        const combined = (existing?.score ?? 0) + boost;
        scoredById.set(item.id, {
          item,
          score: combined,
          rawLabel: existing
            ? `${pred.className} + ${existing.rawLabel}`
            : pred.className,
        });
      }
    }
  }

  const ranked = Array.from(scoredById.values()).sort((a, b) => b.score - a.score);

  const top = ranked[0] ?? {
    item: WASTE_ITEMS[1],
    score: 1.2,
    rawLabel: predictions[0]?.className || 'Unidentified household item',
  };

  const topHeadProb = trainedHeadPredictions?.[0]?.probability ?? 0;
  const baseConfidence = topHeadProb > 0
    ? Math.min(98, Math.max(66, Math.round(topHeadProb * 100)))
    : predictions[0]?.probability
      ? Math.min(98, Math.max(62, Math.round(predictions[0].probability * 100 + 28)))
      : 74;

  const effectiveCategory = resolveEffectiveCategory(top.item, condition);
  const { score: effectiveScore, adjusted } = calculateFourFactorScore(
    top.item.fourFactor,
    condition
  );

  const alternatives = ranked.slice(1, 4).map((r, idx) => ({
    item: r.item,
    confidence: Math.max(18, baseConfidence - (idx + 1) * 18),
    rawLabel: r.rawLabel,
  }));

  return {
    item: top.item,
    confidence: ranked.length > 0 ? baseConfidence : 58,
    rawLabel: top.rawLabel,
    source,
    condition,
    effectiveCategory,
    effectiveScore,
    effectiveFactors: adjusted,
    alternativeMatches: alternatives,
    timestamp: Date.now(),
  };
}

function analyzeCanvasVisualSignature(
  sourceEl: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Array<{ className: string; probability: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [{ className: 'plastic bottle', probability: 0.65 }];

  ctx.drawImage(sourceEl, 0, 0, 48, 48);
  const { data } = ctx.getImageData(0, 0, 48, 48);

  let rSum = 0;
  let bSum = 0;
  let brightCount = 0;
  let darkCount = 0;
  let warmYellowCount = 0;
  let greenCount = 0;
  let brownCount = 0;

  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    rSum += r;
    bSum += b;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 205) brightCount++;
    if (lum < 65) darkCount++;
    if (r > 165 && g > 140 && b < 110) warmYellowCount++;
    if (g > r + 15 && g > b + 15) greenCount++;
    if (r > 110 && r < 190 && g > 75 && g < 150 && b < 110) brownCount++;
  }

  if (warmYellowCount / total > 0.16 || greenCount / total > 0.18) {
    return [{ className: 'banana peel organic fruit', probability: 0.78 }];
  }
  if (darkCount / total > 0.45) {
    return [{ className: 'smartphone electronic circuit', probability: 0.72 }];
  }
  if (brownCount / total > 0.25) {
    return [{ className: 'corrugated cardboard carton', probability: 0.76 }];
  }
  if (brightCount / total > 0.35 && bSum / total >= rSum / total) {
    return [{ className: 'water bottle plastic', probability: 0.74 }];
  }
  return [{ className: 'aluminum soda can', probability: 0.68 }];
}

function getElementDimensions(
  element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): { width: number; height: number } {
  if (element instanceof HTMLVideoElement) {
    return {
      width: element.videoWidth || element.width || GEMINI_MAX_EDGE_PX,
      height: element.videoHeight || element.height || GEMINI_MAX_EDGE_PX,
    };
  }
  if (element instanceof HTMLImageElement) {
    return {
      width: element.naturalWidth || element.width || GEMINI_MAX_EDGE_PX,
      height: element.naturalHeight || element.height || GEMINI_MAX_EDGE_PX,
    };
  }
  return {
    width: element.width || GEMINI_MAX_EDGE_PX,
    height: element.height || GEMINI_MAX_EDGE_PX,
  };
}

function getReusableCanvas(existing: HTMLCanvasElement | null, width: number, height: number): HTMLCanvasElement {
  const canvas = existing ?? document.createElement('canvas');
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return canvas;
}

function encodeForGeminiVision(
  element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): string | null {
  const { width: srcW, height: srcH } = getElementDimensions(element);
  const scale = Math.min(1, GEMINI_MAX_EDGE_PX / Math.max(srcW, srcH, 1));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  geminiCanvas = getReusableCanvas(geminiCanvas, targetW, targetH);
  const ctx = geminiCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(element, 0, 0, targetW, targetH);
  const dataUrl = geminiCanvas.toDataURL('image/jpeg', 0.72);
  return dataUrl.split(',')[1] || null;
}

function prepareMobilenetInputCanvas(
  element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): HTMLCanvasElement {
  mobilenetCanvas = getReusableCanvas(mobilenetCanvas, MOBILENET_IMAGE_SIZE, MOBILENET_IMAGE_SIZE);
  const ctx = mobilenetCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(element, 0, 0, MOBILENET_IMAGE_SIZE, MOBILENET_IMAGE_SIZE);
  }
  return mobilenetCanvas;
}

async function runSinglePassMobileNet(
  model: MobileNetModel,
  artifact: TrainedWasteHeadArtifact | null,
  inputCanvas: HTMLCanvasElement
): Promise<{
  preds: Array<{ className: string; probability: number }>;
  trainedPreds?: Array<{ cls: string; probability: number }>;
}> {
  const tf = await import('@tensorflow/tfjs');
  const outputNode = model.model?.outputNodes?.[0];

  if (model.model?.execute && outputNode && cachedImagenetClasses) {
    const normConst = model.normalizationConstant ?? 1 / 255;
    const inputMin = model.inputMin ?? 0;

    // Run MobileNetV2 backbone once to extract both AvgPool embedding and 1000-class softmax
    const tensors = tf.tidy(() => {
      const pixels = tf.browser.fromPixels(inputCanvas);
      const normalized = tf.add(tf.mul(tf.cast(pixels, 'float32'), normConst), inputMin);
      const batched = tf.reshape(normalized, [1, MOBILENET_IMAGE_SIZE, MOBILENET_IMAGE_SIZE, 3]);
      const execResult = model.model!.execute(batched, [
        MOBILENET_V2_EMBEDDING_NODE,
        outputNode,
      ]);
      const [embRaw, logits1001] = Array.isArray(execResult)
        ? (execResult as [typeof batched, typeof batched])
        : [execResult as typeof batched, null];

      const out: Record<string, ReturnType<typeof tf.softmax>> = {};
      if (logits1001) {
        const logits1000 = tf.slice(logits1001, [0, 1], [-1, 1000]);
        out.imagenetSoftmax = tf.softmax(logits1000);
      }
      if (cachedHead && artifact && embRaw) {
        const emb = tf.squeeze(embRaw, [1, 2]);
        out.headOut = cachedHead.predict(emb);
      }

      return out;
    });

    try {
      const [imagenetProbs, headProbs] = await Promise.all([
        tensors.imagenetSoftmax ? (tensors.imagenetSoftmax.data() as Promise<Float32Array>) : Promise.resolve(null),
        tensors.headOut ? (tensors.headOut.data() as Promise<Float32Array>) : Promise.resolve(null),
      ]);

      const preds: Array<{ className: string; probability: number }> = [];
      if (imagenetProbs) {
        const topIndices = new Int32Array(5);
        const topVals = new Float32Array(5).fill(-1);
        for (let i = 0; i < imagenetProbs.length; i++) {
          const p = imagenetProbs[i];
          if (p <= topVals[4]) continue;
          let pos = 4;
          while (pos > 0 && p > topVals[pos - 1]) {
            topVals[pos] = topVals[pos - 1];
            topIndices[pos] = topIndices[pos - 1];
            pos--;
          }
          topVals[pos] = p;
          topIndices[pos] = i;
        }
        for (let k = 0; k < 5; k++) {
          if (topVals[k] >= 0) {
            preds.push({
              className: cachedImagenetClasses[topIndices[k]] || `class_${topIndices[k]}`,
              probability: topVals[k],
            });
          }
        }
      }

      let trainedPreds: Array<{ cls: string; probability: number }> | undefined;
      if (headProbs && artifact) {
        trainedPreds = artifact.classes
          .map((cls, idx) => ({ cls, probability: headProbs[idx] ?? 0 }))
          .sort((a, b) => b.probability - a.probability);
      }

      if (preds.length > 0 || trainedPreds) {
        return { preds, trainedPreds };
      }
    } finally {
      tensors.imagenetSoftmax?.dispose();
      tensors.headOut?.dispose();
    }
  }

  // Fallback path if GraphModel internals aren't exposed
  let trainedPreds: Array<{ cls: string; probability: number }> | undefined;
  if (cachedHead && artifact) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headOut = tf.tidy(() => {
      const emb = model.infer(inputCanvas, true) as unknown;
      return cachedHead.predict(emb);
    }) as { data: () => Promise<Float32Array>; dispose: () => void };
    try {
      const probs = await headOut.data();
      trainedPreds = artifact.classes
        .map((cls, idx) => ({ cls, probability: probs[idx] ?? 0 }))
        .sort((a, b) => b.probability - a.probability);
    } finally {
      headOut.dispose();
    }
  }

  const preds = await model.classify(inputCanvas, 5);
  return { preds: preds || [], trainedPreds };
}

export async function classifyElementWithAI(
  element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  condition: ItemCondition,
  source: ScanPrediction['source']
): Promise<ScanPrediction> {
  if (geminiConfigured) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_CLIENT_TIMEOUT_MS);
    try {
      const base64 = encodeForGeminiVision(element);
      if (base64) {
        const resp = await fetch('/api/vision/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: 'image/jpeg',
          }),
          signal: controller.signal,
        });
        if (resp.status === 503) {
          geminiConfigured = false;
        } else if (resp.ok) {
          const data = await resp.json();
          const label = typeof data?.label === 'string' ? data.label.trim() : '';
          if (label) {
            return mapRawLabelsToWaste(
              [{ className: label, probability: 0.94 }],
              condition,
              'gemini-vision'
            );
          }
        }
      }
    } catch (e) {
      console.warn('Gemini Vision fallback to on-device TensorFlow:', e);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  const { model, artifact } = await loadVisionModel();
  if (model) {
    try {
      const inputCanvas = prepareMobilenetInputCanvas(element);
      const { preds, trainedPreds } = await runSinglePassMobileNet(model, artifact, inputCanvas);
      if (preds.length > 0 || trainedPreds) {
        return mapRawLabelsToWaste(preds, condition, source, trainedPreds);
      }
    } catch (err) {
      console.warn('MobileNet inference fallback triggered:', err);
    }
  }

  const fallbackPreds = analyzeCanvasVisualSignature(element);
  return mapRawLabelsToWaste(fallbackPreds, condition, source);
}

export function buildSamplePrediction(
  item: WasteItemProfile,
  condition: ItemCondition
): ScanPrediction {
  const effectiveCategory = resolveEffectiveCategory(item, condition);
  const { score, adjusted } = calculateFourFactorScore(item.fourFactor, condition);

  return {
    item,
    confidence: 96,
    rawLabel: `${item.name} (Verified Reference)`,
    source: 'sample',
    condition,
    effectiveCategory,
    effectiveScore: score,
    effectiveFactors: adjusted,
    alternativeMatches: [],
    timestamp: Date.now(),
  };
}
