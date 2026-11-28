MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

DATASET_PATH = "../dataset/class_01/training.jsonl"

OUTPUT_DIR = "../models/finetuned/vidyanova-qwen-0.5b"

DATASET_PATH = "../dataset/class_10/batch01_class10_maths_ap.jsonl"
DATASET_PATH = "../dataset/combined/training.jsonl"
MAX_SEQ_LENGTH = 1024
LORA_R = 32
LORA_ALPHA = 64
NUM_EPOCHS = 3
WARMUP_STEPS = 10
NUM_EPOCHS = 3
WARMUP_STEPS = 10

MAX_SEQ_LENGTH = 1024

LORA_R = 32
LORA_ALPHA = 64
LORA_DROPOUT = 0.05

BATCH_SIZE = 2
GRADIENT_ACCUMULATION_STEPS = 4

LEARNING_RATE = 2e-4

NUM_EPOCHS = 3

WARMUP_STEPS = 10

SAVE_STEPS = 100
LOGGING_STEPS = 10