"""Florence-2-base-ft (ONNX via OpenVINO): the deliberate tier's main model.

ONNX parts: vision encoder, token embedding, text encoder, decoder. The decoder runs WITHOUT a
key/value cache: every step re-reads all tokens generated so far. The answers are identical to cached
decoding, but the time grows with answer length, so these timings are an UPPER BOUND. (This export's
cached decoders do not work with OpenVINO: decoder_with_past has its token length fixed at 16, and the
merged decoder's If node is rejected by the CPU plugin. A cached conversion needs PyTorch.)
Greedy decoding (the reference uses 3-beam search; greedy
is faster and the difference is noted in the results).

Configurations: all on CPU; all on GPU; vision encoder on NPU with the rest on GPU (the NPU needs
static shapes, which only the vision encoder has).

Tasks, on the first two images: <OD>, phrase grounding "bottle", <OCR>, <CAPTION>. Per run: time for
each stage, tokens generated, end-to-end time, and the decoded answer (so it can be checked by eye).

Run:  laptop\\.venv\\Scripts\\python laptop/bench/florence_bench.py
"""
from __future__ import annotations

import json
import re
import time

import numpy as np
import openvino as ov
from tokenizers import Tokenizer

from common import CACHE, IMAGES, load_rgb, normalize, save, summarize, timed

MODEL_DIR = CACHE / "Florence-2-base-ft"
ONNX = MODEL_DIR / "onnx"
MAX_NEW_TOKENS = 128
RUNS, WARMUP = 2, 1

TASKS = {
    "<OD>": "Locate the objects with category name in the image.",
    "<CAPTION_TO_PHRASE_GROUNDING>:bottle": "Locate the phrases in the caption: bottle",
    "<OCR>": "What is the text in the image?",
    "<CAPTION>": "What does the image describe?",
}
CONFIGS = {
    "all_cpu": {"vision": "CPU", "rest": "CPU"},
    "all_gpu": {"vision": "GPU", "rest": "GPU"},
    "vision_npu_rest_gpu": {"vision": "NPU", "rest": "GPU"},
}
LOC = re.compile(r"([^<>]*?)((?:<loc_\d+>){4})")


class Florence:
    def __init__(self, core: ov.Core, vision_device: str, rest_device: str):
        gen = json.loads((MODEL_DIR / "generation_config.json").read_text())
        cfg = json.loads((MODEL_DIR / "config.json").read_text())
        self.start_id = gen.get("decoder_start_token_id", cfg.get("decoder_start_token_id", 2))
        self.eos_id = gen.get("eos_token_id", 2)
        self.forced_bos = gen.get("forced_bos_token_id")
        pre = json.loads((MODEL_DIR / "preprocessor_config.json").read_text())
        size = pre.get("size", {"height": 768, "width": 768})
        self.size = (size.get("width", 768), size.get("height", 768))
        self.mean, self.std = pre.get("image_mean"), pre.get("image_std")
        self.tok = Tokenizer.from_file(str(MODEL_DIR / "tokenizer.json"))

        vision = core.read_model(ONNX / "vision_encoder.onnx")
        vision.reshape({vision.inputs[0].any_name: [1, 3, self.size[1], self.size[0]]})
        t0 = time.perf_counter()
        self.vision = core.compile_model(vision, vision_device)
        self.embed = core.compile_model(ONNX / "embed_tokens.onnx", rest_device)
        self.encoder = core.compile_model(ONNX / "encoder_model.onnx", rest_device)
        self.decoder = core.compile_model(ONNX / "decoder_model.onnx", rest_device)
        self.compile_ms = (time.perf_counter() - t0) * 1000
        self.logits_port = next(o for o in self.decoder.outputs if "logits" in o.get_names())

    def _embed(self, ids: list[int]) -> np.ndarray:
        return self.embed({0: np.array([ids], np.int64)})[0]

    def run(self, image, prompt: str) -> dict:
        timings = {}
        pixels = normalize(image, self.size, self.mean, self.std)
        img_feat, timings["visionMs"] = timed(lambda: self.vision({0: pixels})[0])
        t0 = time.perf_counter()
        ids = self.tok.encode(prompt).ids
        embeds = np.concatenate([img_feat, self._embed(ids)], axis=1)
        mask = np.ones(embeds.shape[:2], np.int64)
        enc = self.encoder({"inputs_embeds": embeds, "attention_mask": mask})["last_hidden_state"]
        timings["textEncoderMs"] = (time.perf_counter() - t0) * 1000

        t0 = time.perf_counter()
        out_ids: list[int] = []
        token = self.start_id
        seq = [self.start_id]
        for step in range(MAX_NEW_TOKENS):
            res = self.decoder({"inputs_embeds": self._embed(seq), "encoder_hidden_states": enc,
                                "encoder_attention_mask": mask})
            logits = res[self.logits_port][0, -1]
            token = int(self.forced_bos) if (step == 0 and self.forced_bos is not None) else int(np.argmax(logits))
            if token == self.eos_id and step > 0:
                break
            out_ids.append(token)
            seq.append(token)
        timings["decodeMs"] = (time.perf_counter() - t0) * 1000
        timings["tokens"] = len(out_ids)
        timings["perTokenMs"] = timings["decodeMs"] / max(len(out_ids), 1)
        timings["totalMs"] = timings["visionMs"] + timings["textEncoderMs"] + timings["decodeMs"]
        text = self.tok.decode(out_ids, skip_special_tokens=False).replace("<s>", "").replace("</s>", "").replace("<pad>", "").strip()
        return {"timings": {k: round(v, 1) if isinstance(v, float) else v for k, v in timings.items()}, "answer": text}


def parse_locations(text: str) -> list[dict]:
    """'bottle<loc_1><loc_2><loc_3><loc_4>' -> label and box in 0..1 (Florence uses 1000 bins)."""
    out = []
    for label, locs in LOC.findall(text):
        v = [int(x) / 999.0 for x in re.findall(r"\d+", locs)]
        out.append({"label": label.strip(), "box_xyxy_norm": [round(x, 3) for x in v]})
    return out


def main() -> None:
    core = ov.Core()
    images = [(p.name, load_rgb(p)) for p in IMAGES[:2]]
    results = {}
    for cname, devs in CONFIGS.items():
        entry: dict = {"devices": devs}
        try:
            fl = Florence(core, devs["vision"], devs["rest"])
            entry["compileMs"] = round(fl.compile_ms, 1)
            per_task: dict = {}
            for task, prompt in TASKS.items():
                totals, answers, stages = [], {}, []
                for name, img in images:
                    for _ in range(WARMUP):
                        fl.run(img, prompt)
                    for _ in range(RUNS):
                        r = fl.run(img, prompt)
                        totals.append(r["timings"]["totalMs"])
                        stages.append(r["timings"])
                    answers[name] = {"answer": r["answer"][:300], "boxes": parse_locations(r["answer"])[:5]}
                per_task[task] = {"totalMs": summarize(totals), "lastRunStages": stages[-1], "answers": answers}
                print(cname, task, json.dumps(per_task[task]["totalMs"]), json.dumps(answers)[:300])
            entry["tasks"] = per_task
        except Exception as e:
            entry["error"] = f"{type(e).__name__}: {str(e)[:400]}"
            print(cname, "ERROR", entry["error"])
        results[cname] = entry

    path = save("florence", {"model": "onnx-community/Florence-2-base-ft (fp32 ONNX parts)",
                             "decoding": f"greedy, max {MAX_NEW_TOKENS} new tokens, no key/value cache (timings are an upper bound; reference uses 3-beam search with cache)",
                             "runsPerImage": RUNS, "configs": results})
    print("saved", path)


if __name__ == "__main__":
    main()
