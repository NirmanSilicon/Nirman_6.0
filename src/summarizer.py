from __future__ import annotations

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def generate_study_guide(chunks: list[dict], num_points: int = 5) -> dict:
    """
    Generate a literature & study guide containing:
    1. Core Narrative / Thematic Takeaways (TF-IDF TextRank)
    2. Active Recall Flashcards
    3. Literary Device & Quote Bank (Similes, Dialogue, Rhetorical Questions)
    """
    if not chunks:
        return {"takeaways": [], "flashcards": [], "literary_devices": []}

    texts = [c["text"] for c in chunks]

    # 1. Core Takeaways (TextRank)
    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        tfidf_matrix = vectorizer.fit_transform(texts)
        sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        scores = sim_matrix.sum(axis=1).flatten()
        top_indices = sorted(np.argsort(scores)[::-1][:num_points])
    except ValueError:
        top_indices = list(range(min(num_points, len(chunks))))

    takeaways = []
    for idx in top_indices:
        chunk = chunks[idx]
        takeaways.append({
            "text": chunk["text"],
            "document_name": chunk["document_name"],
            "page_number": chunk["page_number"],
            "citation": f"({chunk['document_name'].replace('.pdf', '')}, p. {chunk['page_number']})"
        })

    # 2. Active Recall Flashcards
    flashcards = []
    trigger_patterns = [
        (r"([A-Z][^.?!]*?\b(?:refers to|is defined as|means|involves|can complement|represents)\b[^.?!]+[.?!])", "Concept Check"),
        (r"([A-Z][^.?!]*?\b(?:associated with|cooler than|difference of|more likely to|caused by)\b[^.?!]+[.?!])", "Key Insight Check"),
    ]

    seen_cards = set()
    for chunk in chunks:
        for pattern, card_type in trigger_patterns:
            matches = re.findall(pattern, chunk["text"])
            for match in matches:
                clean_stmt = match.strip()
                if 40 <= len(clean_stmt) <= 260 and clean_stmt not in seen_cards:
                    seen_cards.add(clean_stmt)
                    words = clean_stmt.split()
                    subject = " ".join(words[:5]).rstrip(",;:")
                    flashcards.append({
                        "type": card_type,
                        "question": f"What does the text reveal about: '{subject}...'?",
                        "answer": clean_stmt,
                        "citation": f"({chunk['document_name'].replace('.pdf', '')}, p. {chunk['page_number']})"
                    })
                    if len(flashcards) >= 6:
                        break
            if len(flashcards) >= 6:
                break
        if len(flashcards) >= 6:
            break

    # 3. Literary Devices & Notable Quotes
    literary_devices = []
    device_rules = [
        (r'("[^"]{15,200}")', "💬 Notable Dialogue / Quote"),
        (r"([A-Z][^.?!]*?\b(?:like a|like an|as \w+ as)\b[^.?!]+[.?!])", "✨ Simile / Figurative Comparison"),
        (r"([A-Z][^.?!]{20,180}\?)", "❓ Rhetorical / Thematic Question"),
    ]

    seen_quotes = set()
    for chunk in chunks:
        for pattern, device_label in device_rules:
            matches = re.findall(pattern, chunk["text"])
            for m in matches:
                quote = m.strip()
                if quote not in seen_quotes and len(quote) >= 20:
                    seen_quotes.add(quote)
                    literary_devices.append({
                        "device": device_label,
                        "quote": quote,
                        "citation": f"({chunk['document_name'].replace('.pdf', '')}, p. {chunk['page_number']})"
                    })
                    if len(literary_devices) >= 8:
                        break
            if len(literary_devices) >= 8:
                break
        if len(literary_devices) >= 8:
            break

    return {
        "takeaways": takeaways,
        "flashcards": flashcards,
        "literary_devices": literary_devices,
    }


def compute_narrative_pacing(chunks: list[dict]) -> list[dict]:
    """
    Lightweight lexical emotional/dramatic intensity tracker across reading progression
    (zero extra ML models needed).
    """
    positive_words = {
        "cool", "cooler", "cooling", "calm", "hope", "bright", "safe", "support",
        "benefit", "relief", "healthy", "mature", "improve", "accessible", "protect"
    }
    tension_words = {
        "heat", "extreme", "risk", "danger", "crisis", "barrier", "limited", "illness",
        "contradiction", "caution", "loss", "fear", "conflict", "dark", "struggle", "high"
    }

    arc_points = []
    for idx, chunk in enumerate(chunks, start=1):
        words = set(re.findall(r"\b\w+\b", chunk["text"].lower()))
        pos_hits = len(words & positive_words)
        neg_hits = len(words & tension_words)
        # Net tone score (-5 to +5) and dramatic intensity (total emotional markers)
        net_tone = pos_hits - neg_hits
        intensity = pos_hits + neg_hits

        arc_points.append({
            "Passage #": idx,
            "Document": chunk["document_name"],
            "Page": chunk["page_number"],
            "Emotional Tone": net_tone,
            "Dramatic Intensity": intensity,
            "Preview": chunk["text"][:90] + "..."
        })

    return arc_points