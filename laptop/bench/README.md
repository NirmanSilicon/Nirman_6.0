# laptop/bench: Phase 0 laptop benchmarks

Measures the deliberate-tier models on this laptop with OpenVINO, and serves the phone link test.
Results go to `tools/results/laptop_*.json`; the summary is in `DEVICE_REPORT.md`.

## How it works, in plain words

Each script loads a model from `laptop/models_cache/` (ONNX files, not in git), compiles it for CPU,
GPU and NPU in turn, runs the test photos through it several times, and records how long each run
took (50th and 90th percentile, the same method as the phone). It also checks that the GPU and NPU
give the same answers as the CPU, and saves the models' actual answers so they can be checked by eye.

| Script | What it measures |
| --- | --- |
| `fetch_models.py` | Downloads the three models (about 2.3 GB) |
| `depth_bench.py` | Depth-Anything-V2-Small: speed, and depth-map agreement with the CPU |
| `gdino_bench.py` | Grounding DINO tiny: finding named objects ("bottle . cup . pen ."), speed, top detections |
| `florence_bench.py` | Florence-2-base-ft: object naming, finding a phrase, OCR, captions; time per stage. Decodes without a key/value cache, so its times are an upper bound |
| `link_server.py` | Echo server for the phone's link test (`adb reverse tcp:8765 tcp:8765`) |
| `common.py` | Shared timing, percentiles, image loading, results files |

## Run (Windows, Git Bash or PowerShell)

```
py -3.11 -m venv laptop/.venv
laptop/.venv/Scripts/python -m pip install openvino huggingface_hub tokenizers numpy pillow
laptop/.venv/Scripts/python laptop/bench/fetch_models.py
cd laptop/bench && ../.venv/Scripts/python depth_bench.py   # likewise gdino_bench.py, florence_bench.py
```

Test images are the real photos in the read-only `secondsense/` copy, until the team's own table
photos exist.
