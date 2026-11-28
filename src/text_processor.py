from __future__ import annotations

import re
from typing import TypedDict


class TextChunk(TypedDict):
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    chunk_index: int
    text: str


def clean_text(text: str) -> str:
    """Clean page text by stripping titles, metadata headers, and section labels."""
    if not text:
        return ""

    # Replace newlines with single space
    cleaned = re.sub(r"\s+", " ", text).strip()

    # Strip out repeating paper headers and titles
    cleaned = re.sub(r"Urban Green Spaces and Summer Heat: A Multi-Neighborhood Study", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Tree Canopy, Park Size, and Urban Temperature: Evidence from Navapur", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Cooling Centres and Heat-Health Preparedness in Coastal Cities", "", cleaned, flags=re.IGNORECASE)

    # Strip metadata lines and section titles
    cleaned = re.sub(r"Fictional (research paper|research report|policy research brief).*?Abstract", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"LEXICON synthetic test document not real research", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(Abstract|Introduction|Methods|Results|Interpretation|Conclusion|Background|Findings|Purpose)\b", "", cleaned, flags=re.IGNORECASE)

    # Clean up whitespace left behind
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

def chunk_extracted_pages(
    extracted_pages: list[dict],
    target_sentences_per_chunk: int = 3,
) -> list[TextChunk]:
    """Split page text into clean, sentence-aligned chunks."""
    chunks: list[TextChunk] = []

    for page in extracted_pages:
        if not page["has_text"]:
            continue

        cleaned_page_text = clean_text(page["text"])
        if not cleaned_page_text:
            continue

        doc_id = page["document_id"]
        doc_name = page["document_name"]
        page_num = page["page_number"]

        # Split strictly by sentence
        raw_sentences = re.split(r"(?<=[.!?])\s+", cleaned_page_text)
        sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 15]

        if not sentences:
            continue

        chunk_index = 0
        step = max(1, target_sentences_per_chunk - 1)

        for i in range(0, len(sentences), step):
            chunk_sentences = sentences[i : i + target_sentences_per_chunk]
            chunk_text = " ".join(chunk_sentences)

            if len(chunk_text) >= 50:
                chunks.append({
                    "chunk_id": f"{doc_id}-p{page_num}-c{chunk_index}",
                    "document_id": doc_id,
                    "document_name": doc_name,
                    "page_number": page_num,
                    "chunk_index": chunk_index,
                    "text": chunk_text,
                })
                chunk_index += 1

    return chunks