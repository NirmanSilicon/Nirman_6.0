"""Depth-Anything-V2-Small (ONNX via OpenVINO) on CPU, GPU and NPU.

Per device: compile time, per-image latency (2 warm-up runs, then 10 timed runs per image), and
agreement with the CPU depth map (Pearson correlation and mean relative difference). A fixed
518 x 518 input keeps shapes static, which the NPU requires.

Run:  laptop\\.venv\\Scripts\\python laptop/bench/depth_bench.py
"""
from __future__ import annotations

import json

import numpy as np
import openvino as ov

from common import CACHE, DEVICES, IMAGES, load_rgb, normalize, save, summarize, timed

MODEL_DIR = CACHE / "depth-anything-v2-small"
SIZE = 518
RUNS = 10
WARMUP = 2


def main() -> None:
    pre = json.loads((MODEL_DIR / "preprocessor_config.json").read_text())
    mean, std = pre.get("image_mean", [0.485, 0.456, 0.406]), pre.get("image_std", [0.229, 0.224, 0.225])
    inputs = [normalize(load_rgb(p), (SIZE, SIZE), mean, std) for p in IMAGES]

    core = ov.Core()
    model = core.read_model(MODEL_DIR / "onnx" / "model.onnx")
    model.reshape({model.inputs[0].any_name: [1, 3, SIZE, SIZE]})

    results, reference = {}, None
    for device in DEVICES:
        entry: dict = {}
        try:
            compiled, compile_ms = timed(lambda: core.compile_model(model, device))
            entry["compileMs"] = round(compile_ms, 1)
            request = compiled.create_infer_request()
            latencies, outputs = [], []
            for x in inputs:
                for _ in range(WARMUP):
                    request.infer({0: x})
                for _ in range(RUNS):
                    _, ms = timed(lambda: request.infer({0: x}))
                    latencies.append(ms)
                outputs.append(request.get_output_tensor(0).data.copy().ravel())
            entry["latencyMs"] = summarize(latencies)
            if reference is None:
                reference = outputs
                entry["agreementWithCpu"] = "reference"
            else:
                corr = [float(np.corrcoef(a, b)[0, 1]) for a, b in zip(reference, outputs)]
                rel = [float(np.mean(np.abs(a - b)) / (np.mean(np.abs(a)) + 1e-9)) for a, b in zip(reference, outputs)]
                entry["agreementWithCpu"] = {"minCorrelation": round(min(corr), 5), "maxMeanRelativeDiff": round(max(rel), 5)}
        except Exception as e:  # report the failure; never hide it
            entry["error"] = f"{type(e).__name__}: {str(e)[:300]}"
        results[device] = entry
        print(device, json.dumps(entry))

    path = save("depth", {"model": "onnx-community/depth-anything-v2-small onnx/model.onnx (fp32)",
                          "input": f"1x3x{SIZE}x{SIZE}", "runsPerImage": RUNS, "warmupPerImage": WARMUP,
                          "devices": results})
    print("saved", path)


if __name__ == "__main__":
    main()
