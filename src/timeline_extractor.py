from __future__ import annotations

import re
from typing import TypedDict


class TimelineEvent(TypedDict):
    year: int
    raw_date: str
    context_text: str
    document_id: str
    document_name: str
    page_number: int
    chunk_id: str


def extract_timeline_events(chunks: list[dict]) -> list[TimelineEvent]:
    """
    Extract date and year references from text chunks and arrange them chronologically.

    Args:
        chunks: List of text chunk dictionaries.

    Returns:
        A list of TimelineEvent dictionaries sorted by year.
    """
    timeline_events: list[TimelineEvent] = []

    # Regex pattern for 4-digit years (restricting to plausible historical/future publication years: 1800-2099)
    year_pattern = re.compile(r"\b(1[89]\d{2}|20\d{2})\b")

    for chunk in chunks:
        text = chunk.get("text", "")
        if not text:
            continue

        matches = year_pattern.finditer(text)
        for match in matches:
            year_str = match.group(1)
            year = int(year_str)

            # Build a short context snippet around the matched year
            start_idx = max(0, match.start() - 40)
            end_idx = min(len(text), match.end() + 40)
            snippet = text[start_idx:end_idx].strip()

            event: TimelineEvent = {
                "year": year,
                "raw_date": year_str,
                "context_text": f"...{snippet}...",
                "document_id": chunk["document_id"],
                "document_name": chunk["document_name"],
                "page_number": chunk["page_number"],
                "chunk_id": chunk["chunk_id"],
            }
            timeline_events.append(event)

    # Sort events chronologically by year
    timeline_events.sort(key=lambda x: x["year"])
    return timeline_events