import json
from collections import Counter
from pathlib import Path

DATASET_DIR = Path(__file__).resolve().parents[1] / "dataset"
INPUT_FILES = sorted(
    list(DATASET_DIR.glob("class_*/*.jsonl"))
    + list((DATASET_DIR / "contrast").glob("*.jsonl"))
)
OUTPUT_FILE = DATASET_DIR / "combined" / "training.jsonl"
LANGUAGES = {"english", "hindi", "hinglish"}
STYLES = {"simple", "detailed", "step_by_step", "example", "exam_ready", "basic"}
REQUIRED_TEXT_FIELDS = (
    "subject",
    "language",
    "teaching_style",
    "question",
    "response",
)
RESPONSE_LABELS = ("Answer:", "Explanation:", "Steps:")


def main():
    seen = set()
    valid = []
    skipped = Counter()

    for path in INPUT_FILES:
        with path.open(encoding="utf-8") as source:
            for line_number, line in enumerate(source, 1):
                try:
                    example = json.loads(line)
                except json.JSONDecodeError:
                    skipped["invalid JSON"] += 1
                    continue

                if not isinstance(example, dict):
                    skipped["not a JSON object"] += 1
                    continue

                if any(
                    not isinstance(example.get(field), str)
                    or not example[field].strip()
                    for field in REQUIRED_TEXT_FIELDS
                ):
                    skipped["missing or empty field"] += 1
                    continue

                example_class = example.get("class")
                if isinstance(example_class, bool) or not isinstance(
                    example_class, int
                ):
                    skipped["class is not an integer"] += 1
                    continue
                if not 1 <= example_class <= 10:
                    skipped["class outside 1-10"] += 1
                    continue

                language = example["language"].strip().lower()
                style = example["teaching_style"].strip().lower()
                if language not in LANGUAGES:
                    skipped["unsupported language"] += 1
                    continue
                if style not in STYLES:
                    skipped["unsupported teaching style"] += 1
                    continue

                response = example["response"].strip()
                if any(
                    label.casefold() in response.casefold()
                    for label in RESPONSE_LABELS
                ):
                    skipped["response contains a legacy label"] += 1
                    continue

                example["class"] = example_class
                example["subject"] = example["subject"].strip()
                example["language"] = language
                example["teaching_style"] = style
                example["question"] = example["question"].strip()
                example["response"] = response
                key = (
                    example_class,
                    example["subject"],
                    example["question"].lower(),
                    language,
                    style,
                )
                if key in seen:
                    skipped["duplicate"] += 1
                    continue

                seen.add(key)
                valid.append(example)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", encoding="utf-8", newline="\n") as destination:
        for example in valid:
            destination.write(json.dumps(example, ensure_ascii=False) + "\n")

    class_counts = Counter(example["class"] for example in valid)
    language_counts = Counter(example["language"] for example in valid)
    style_counts = Counter(example["teaching_style"] for example in valid)
    print(f"Valid: {len(valid)} | Skipped: {sum(skipped.values())}")
    if skipped:
        print("Skipped reasons:", dict(sorted(skipped.items())))
    print(
        "Class counts:",
        {class_number: class_counts[class_number] for class_number in range(1, 11)},
    )
    print("Language counts:", dict(sorted(language_counts.items())))
    print("Teaching style counts:", dict(sorted(style_counts.items())))
    for class_number in range(1, 11):
        if class_counts[class_number] < 100:
            print(
                f"WARNING: Class {class_number} has fewer than 100 examples "
                f"({class_counts[class_number]})."
            )
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
