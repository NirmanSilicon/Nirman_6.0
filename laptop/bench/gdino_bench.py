"""Grounding DINO tiny (ONNX via OpenVINO): open-vocabulary detection on CPU, GPU and NPU.

Prompt: named objects separated by " . " (the model's convention). Fixed 800 x 800 image and a
fixed 32-token text keep shapes static. Per device: compile time, latency (1 warm-up + 3 timed runs
per image), the top detections on the first image (to show the answers are real), and agreement of
the top scores with the CPU.

Run:  laptop\\.venv\\Scripts\\python laptop/bench/gdino_bench.py
"""
from __future__ import annotations

import json

import numpy as np
import openvino as ov
from tokenizers import Tokenizer

from common import CACHE, DEVICES, IMAGES, load_rgb, normalize, save, summarize, timed

MODEL_DIR = CACHE / "grounding-dino-tiny-ONNX"
SIZE = 800
TEXT_LEN = 32
PROMPT = "bottle . cup . pen . keys . phone ."
BOX_THRESHOLD = 0.35
RUNS, WARMUP = 3, 1


def encode_text(tok: Tokenizer) -> dict[str, np.ndarray]:
    enc = tok.encode(PROMPT.lower())
    ids = enc.ids[:TEXT_LEN]
    n = len(ids)
    pad = TEXT_LEN - n
    return {
        "input_ids": np.array([ids + [0] * pad], np.int64),
        "token_type_ids": np.zeros((1, TEXT_LEN), np.int64),
        "attention_mask": np.array([[1] * n + [0] * pad], np.int64),
        "_tokens": enc.tokens[:TEXT_LEN],
    }


def phrase_of(tokens: list[str], index: int) -> str:
    """The prompt phrase that contains token [index] (phrases are separated by '.')."""
    start = index
    while start > 0 and tokens[start - 1] not in {".", "[CLS]"}:
        start -= 1
    end = index
    while end + 1 < len(tokens) and tokens[end + 1] not in {".", "[SEP]"}:
        end += 1
    return " ".join(t for t in tokens[start:end + 1]).replace(" ##", "")


def top_detections(logits: np.ndarray, boxes: np.ndarray, tokens: list[str], n_text: int) -> list[dict]:
    probs = 1.0 / (1.0 + np.exp(-logits[0, :, :n_text]))
    best_token = probs.argmax(axis=1)
    best_score = probs.max(axis=1)
    order = np.argsort(-best_score)
    out = []
    for q in order[:10]:
        if best_score[q] < BOX_THRESHOLD:
            break
        cx, cy, w, h = boxes[0, q]
        out.append({"phrase": phrase_of(tokens, int(best_token[q])), "score": round(float(best_score[q]), 3),
                    "box_xyxy_norm": [round(float(v), 3) for v in (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)]})
    return out


def main() -> None:
    pre = json.loads((MODEL_DIR / "preprocessor_config.json").read_text())
    mean, std = pre.get("image_mean", [0.485, 0.456, 0.406]), pre.get("image_std", [0.229, 0.224, 0.225])
    tok = Tokenizer.from_file(str(MODEL_DIR / "tokenizer.json"))
    text = encode_text(tok)
    tokens, n_text = text.pop("_tokens"), int(text["attention_mask"].sum())
    images = [normalize(load_rgb(p), (SIZE, SIZE), mean, std) for p in IMAGES]

    core = ov.Core()
    model = core.read_model(MODEL_DIR / "onnx" / "model.onnx")
    names = [i.any_name for i in model.inputs]
    shapes = {"pixel_values": [1, 3, SIZE, SIZE], "pixel_mask": [1, SIZE, SIZE]}
    shapes.update({k: [1, TEXT_LEN] for k in ("input_ids", "token_type_ids", "attention_mask")})
    model.reshape({n: shapes[n] for n in names if n in shapes})
    out_names = [o.any_name for o in model.outputs]

    def feed(img: np.ndarray) -> dict:
        f = {"pixel_values": img, "pixel_mask": np.ones((1, SIZE, SIZE), np.int64), **text}
        return {k: v for k, v in f.items() if k in names}

    results, ref_scores = {}, None
    for device in DEVICES:
        entry: dict = {}
        try:
            compiled, compile_ms = timed(lambda: core.compile_model(model, device))
            entry["compileMs"] = round(compile_ms, 1)
            req = compiled.create_infer_request()
            lat, top_scores = [], []
            for i, img in enumerate(images):
                for _ in range(WARMUP):
                    req.infer(feed(img))
                for _ in range(RUNS):
                    _, ms = timed(lambda: req.infer(feed(img)))
                    lat.append(ms)
                logits = req.get_tensor(out_names[0]).data.copy()
                boxes = req.get_tensor(out_names[1]).data.copy()
                dets = top_detections(logits, boxes, tokens, n_text)
                top_scores.append([d["score"] for d in dets[:3]])
                if i == 0:
                    entry["firstImageTopDetections"] = {"image": IMAGES[0].name, "detections": dets[:5]}
            entry["latencyMs"] = summarize(lat)
            if ref_scores is None:
                ref_scores = top_scores
                entry["agreementWithCpu"] = "reference"
            else:
                diffs = [abs(a - b) for ra, rb in zip(ref_scores, top_scores) for a, b in zip(ra, rb)]
                entry["agreementWithCpu"] = {"topScoreMaxAbsDiff": round(max(diffs), 4) if diffs else None,
                                             "comparedScores": len(diffs)}
        except Exception as e:
            entry["error"] = f"{type(e).__name__}: {str(e)[:300]}"
        results[device] = entry
        print(device, json.dumps(entry))

    path = save("gdino", {"model": "onnx-community/grounding-dino-tiny-ONNX onnx/model.onnx (fp32)",
                          "prompt": PROMPT, "input": f"{SIZE}x{SIZE}, {TEXT_LEN} text tokens",
                          "inputs": names, "outputs": out_names, "runsPerImage": RUNS, "devices": results})
    print("saved", path)


if __name__ == "__main__":
    main()
