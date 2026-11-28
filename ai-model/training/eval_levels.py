from pathlib import Path
import sys

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from dataset_loader import build_system_prompt

MODEL_PATH = (
    Path(__file__).resolve().parents[1]
    / "models"
    / "merged"
    / "vidyanova-qwen-0.5b"
)
TESTS = (
    ("General", "What is a plant?", [1, 5, 10]),
    ("Mathematics", "What is a fraction?", [3, 5, 9]),
    ("Mathematics", "Explain the quadratic formula", [1, 5]),
    ("Science", "What is force?", [4, 8, 10]),
)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH,
        torch_dtype=torch.float32,
    )
    model.eval()

    for subject, question, classes in TESTS:
        for class_number in classes:
            system_prompt = build_system_prompt(
                class_number,
                subject,
                "",
                "",
                "english",
                "simple",
            )
            prompt = (
                "<|im_start|>system\n"
                + system_prompt
                + "<|im_end|>\n"
                + "<|im_start|>user\n"
                + question
                + "<|im_end|>\n"
                + "<|im_start|>assistant\n"
            )
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            with torch.inference_mode():
                output = model.generate(
                    **inputs,
                    max_new_tokens=160,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    repetition_penalty=1.15,
                )
            answer = tokenizer.decode(
                output[0, inputs["input_ids"].shape[1] :],
                skip_special_tokens=True,
            ).strip()
            print(f"[Class {class_number} | {subject}] {question}")
            print(answer)
            print()


if __name__ == "__main__":
    main()
