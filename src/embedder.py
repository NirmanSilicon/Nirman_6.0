from __future__ import annotations

import numpy as np
import streamlit as st
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


@st.cache_resource(show_spinner=False)
def load_embedding_model(model_name: str = "all-MiniLM-L6-v2") -> SentenceTransformer:
    """Load the sentence-transformer model once and cache it in RAM across sessions."""
    return SentenceTransformer(model_name, device="cpu")


def generate_embeddings(texts: list[str], batch_size: int = 16) -> np.ndarray:
    """
    Generate normalized embeddings compressed to float16 to cut RAM usage by 75%
    on entry-level laptops.
    """
    if not texts:
        return np.array([], dtype=np.float16)

    model = load_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True,
    )
    return np.asarray(embeddings, dtype=np.float16)


def semantic_search(
    query: str,
    chunks: list[dict],
    chunk_embeddings: np.ndarray,
    top_k: int = 5,
) -> list[dict]:
    """Retrieve the top-k semantically closest passages to a student's query."""
    if not query.strip() or not chunks or chunk_embeddings is None or chunk_embeddings.size == 0:
        return []

    model = load_embedding_model()
    query_vec = model.encode([query], normalize_embeddings=True)

    # Compute cosine similarity using float32 precision for accuracy
    scores = cosine_similarity(query_vec, chunk_embeddings.astype(np.float32))[0]
    top_indices = np.argsort(scores)[::-1][:top_k]

    results = []
    for idx in top_indices:
        chunk = chunks[idx].copy()
        chunk["similarity_score"] = float(scores[idx])
        results.append(chunk)

    return results