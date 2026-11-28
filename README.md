# VidyaAI

VidyaAI is an Android learning app with a local Qwen 0.5B tutor, plus scripts and data for preparing and fine-tuning the tutor model.

## AI model and training

- Base model: `Qwen/Qwen2.5-0.5B-Instruct`, fine-tuned with LoRA.
- Training settings in `ai-model/training/config.py`: combined dataset, sequence length 1024, LoRA rank 32, alpha 64, 3 epochs, and 10 warmup steps.
- `ai-model/training/prepare_dataset.py` combines JSONL files from `ai-model/dataset/class_*` and `ai-model/dataset/contrast`. It validates required fields, class levels, languages and teaching styles; rejects legacy response labels; and deduplicates records using class, subject, question, language, and style.
- The legacy Class 1 dataset is kept at `ai-model/dataset/_old/training.jsonl`. The prepared dataset is `ai-model/dataset/combined/training.jsonl`.
- Latest preparation run: 25 valid examples, 0 skipped. Class 10 has 25 examples; Classes 1–9 currently have 0. Every class is below 100 examples.
- `ai-model/training/eval_levels.py` evaluates 11 class/subject/question combinations using the merged model in float32.
- `ai-model/training/COLAB_STEPS.md` contains Colab instructions for installing training dependencies, uploading and extracting the archive, running `train_local.py`, and downloading the fine-tuned model.
- A Colab archive was created at `C:\Users\niraj\Desktop\ai-train.zip`. It includes `ai-model/training` and `ai-model/dataset`, excluding model weights and `__pycache__`.

## Building a model for Android

`ai-model/quantization/build_model.ps1` automates these steps:

1. Merge the LoRA adapter with the base model.
2. Convert the merged model to F16 GGUF.
3. Quantize it (default: `Q4_K_M`).
4. Copy `tutor-model.gguf` into Android app assets and report its size.
5. If `-Build` is supplied, run `:app:assembleDebug` and report the APK path and size.

Run it from the quantization directory:

```powershell
cd ai-model\quantization
powershell -ExecutionPolicy Bypass -File .\build_model.ps1 -Build
```

Choose another quantization with `-Quant`, for example `-Quant Q5_K_M`. The script expects the configured `llama-quantize.exe` and Python dependencies to be available. The script was syntax-checked but has not yet been run to generate a quantized model.
