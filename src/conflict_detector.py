from __future__ import annotations

import re
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def extract_non_year_numbers(text: str) -> set[str]:
    """
    Extract numbers from text while filtering out 4-digit publication/study years (1800-2099).
    """
    # Find all integer and floating point numbers
    all_numbers = set(re.findall(r"\b\d+(?:\.\d+)?\b", text))
    # Identify 4-digit year patterns
    years = set(re.findall(r"\b(?:19|20)\d{2}\b", text))
    # Return numbers with years removed
    return all_numbers - years


def detect_potential_conflicts(
    chunks: list[dict],
    chunk_embeddings: np.ndarray,
    similarity_threshold: float = 0.55,
) -> list[dict]:
    """
    Identify potential claim contradictions between chunks across DIFFERENT documents,
    ignoring publication dates and years.
    """
    if len(chunks) < 2 or chunk_embeddings.size == 0:
        return []

    sim_matrix = cosine_similarity(chunk_embeddings, chunk_embeddings)
    num_chunks = len(chunks)

    # Specific negation and contrast triggers
    strong_negations = {"no cooling", "did not reduce", "no effect", "does not lower", "failed to show", "not associated"}
    contrast_markers = {"however", "whereas", "contrary", "conversely", "smaller difference", "unlike"}

    conflicts = []

    for i in range(num_chunks):
        for j in range(i + 1, num_chunks):
            chunk1 = chunks[i]
            chunk2 = chunks[j]

            # Do not compare chunks from the same document
            if chunk1["document_id"] == chunk2["document_id"]:
                continue

            similarity = float(sim_matrix[i][j])
            if similarity < similarity_threshold:
                continue

            text1_lower = chunk1["text"].lower()
            text2_lower = chunk2["text"].lower()

            # Flag 1: Explicit assertion contradiction
            has_neg1 = any(phrase in text1_lower for phrase in strong_negations)
            has_neg2 = any(phrase in text2_lower for phrase in strong_negations)
            negation_mismatch = has_neg1 != has_neg2

            # Flag 2: Explicit contrast marker comparing results
            words_combined = set(re.findall(r"\b\w+\b", text1_lower + " " + text2_lower))
            has_contrast = bool(words_combined & contrast_markers)

            # Flag 3: Numerical mismatch excluding years (e.g. 3.9°C vs 2.1°C)
            nums1 = extract_non_year_numbers(text1_lower)
            nums2 = extract_non_year_numbers(text2_lower)
            number_mismatch = bool(nums1 and nums2 and nums1 != nums2 and len(nums1 & nums2) == 0)

            if negation_mismatch or has_contrast or number_mismatch:
                reason_parts = []
                if number_mismatch:
                    reason_parts.append("Divergent numerical finding")
                if has_contrast:
                    reason_parts.append("Explicit contrast marker")
                if negation_mismatch:
                    reason_parts.append("Direct assertion contradiction")

                conflicts.append({
                    "similarity_score": round(similarity, 4),
                    "conflict_reason": ", ".join(reason_parts),
                    "source_chunk_a": {
                        "document_id": chunk1["document_id"],
                        "document_name": chunk1["document_name"],
                        "page_number": chunk1["page_number"],
                        "text": chunk1["text"],
                    },
                    "source_chunk_b": {
                        "document_id": chunk2["document_id"],
                        "document_name": chunk2["document_name"],
                        "page_number": chunk2["page_number"],
                        "text": chunk2["text"],
                    },
                })

    return conflicts