"""
HealX AI Configuration

Central configuration used by:
- LLM Client
- AI Router
- Memory
- RAG
- ML Models
"""

import os


class AIConfig:

    # ==========================
    # LLM Configuration
    # ==========================

    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")

    OLLAMA_BASE_URL = os.getenv(
        "OLLAMA_BASE_URL",
        "http://localhost:11434"
    )

    # Default local model
    DEFAULT_MODEL = os.getenv(
        "DEFAULT_MODEL",
        "gemma3:4b"
    )

    # ==========================
    # Embedding Configuration
    # ==========================

    EMBEDDING_MODEL = os.getenv(
        "EMBEDDING_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2"
    )

    # ==========================
    # Vector Database
    # ==========================

    VECTOR_DB_PATH = os.getenv(
        "VECTOR_DB_PATH",
        "vector_db"
    )

    # ==========================
    # Memory
    # ==========================

    MEMORY_LIMIT = 10

    # ==========================
    # Queue Prediction Model
    # ==========================

    QUEUE_MODEL_PATH = os.getenv(
        "QUEUE_MODEL_PATH",
        "trained_models/queue_model.pkl"
    )

    # ==========================
    # Hospital Recommendation
    # ==========================

    RECOMMENDATION_MODEL_PATH = os.getenv(
        "RECOMMENDATION_MODEL_PATH",
        "trained_models/recommendation.pkl"
    )
