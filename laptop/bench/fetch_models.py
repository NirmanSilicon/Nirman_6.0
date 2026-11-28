"""Downloads the laptop models (ONNX, run by OpenVINO) into laptop/models_cache/ (gitignored).

Run:  laptop\\.venv\\Scripts\\python laptop/bench/fetch_models.py

Downloads from each repository's main branch; the commit used is recorded in THIRD_PARTY.md.
"""
from pathlib import Path

from huggingface_hub import hf_hub_download

CACHE = Path(__file__).resolve().parents[1] / "models_cache"

# repo id -> files to fetch.
MODELS = {
    "onnx-community/depth-anything-v2-small": [
        "onnx/model.onnx", "config.json", "preprocessor_config.json",
    ],
    "onnx-community/grounding-dino-tiny-ONNX": [
        "onnx/model.onnx", "config.json", "preprocessor_config.json",
        "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json",
    ],
    "onnx-community/Florence-2-base-ft": [
        "onnx/vision_encoder.onnx", "onnx/embed_tokens.onnx", "onnx/encoder_model.onnx",
        "onnx/decoder_model.onnx",
        "config.json", "preprocessor_config.json", "generation_config.json",
        "tokenizer.json", "tokenizer_config.json", "added_tokens.json", "special_tokens_map.json",
    ],
}


def main() -> None:
    for repo, files in MODELS.items():
        target = CACHE / repo.split("/")[1]
        for f in files:
            try:
                p = hf_hub_download(repo, f, local_dir=target)
                print(f"ok  {repo}/{f}  {Path(p).stat().st_size / 1e6:.1f} MB")
            except Exception as e:  # a missing optional file is reported, never hidden
                print(f"MISSING  {repo}/{f}: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
