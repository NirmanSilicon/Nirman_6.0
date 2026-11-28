export interface Quality { ok: boolean; issues: string[]; sharpness: number; brightness: number }
const T = { blur: 40, dark: 45, bright: 235 };

/** Brightness + Laplacian variance on a small grey copy (also used live for the camera guide). */
export function measure(src: CanvasImageSource, w: number, h: number, canvas = document.createElement("canvas")): Quality {
  const W = 240, H = Math.max(1, Math.round((240 * h) / w));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const g = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0; i < W * H; i++) { g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; sum += g[i]; }
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const l = -4 * g[i] + g[i - 1] + g[i + 1] + g[i - W] + g[i + W];
    s += l; s2 += l * l; n++;
  }
  const sharpness = s2 / n - (s / n) ** 2, brightness = sum / (W * H);
  const issues: string[] = [];
  if (sharpness < T.blur) issues.push("blurry");
  if (brightness < T.dark) issues.push("too_dark");
  if (brightness > T.bright) issues.push("too_bright");
  return { ok: !issues.length, issues, sharpness, brightness };
}

export async function toJpeg(src: CanvasImageSource, w: number, h: number, maxSide = 1280): Promise<Blob> {
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.85));
}

export async function fileToBitmap(f: Blob) { return createImageBitmap(f, { imageOrientation: "from-image" }); }
