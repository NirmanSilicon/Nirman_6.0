from __future__ import annotations

import spacy
import spacy.cli
import streamlit as st


@st.cache_resource(show_spinner=False)
def load_nlp_model():
    """Load spaCy with unused components disabled for faster CPU execution."""
    try:
        return spacy.load("en_core_web_sm", disable=["lemmatizer"])
    except OSError:
        spacy.cli.download("en_core_web_sm")
        return spacy.load("en_core_web_sm", disable=["lemmatizer"])


def extract_entities_from_chunks(chunks: list[dict]) -> list[dict]:
    """
    Extract Characters (PERSON), Settings/Institutions (GPE/LOC/ORG),
    and Recurring Motifs/Concepts (Noun Chunks) with chunk-level tracking
    for character co-occurrence mapping.
    """
    nlp = load_nlp_model()
    entities = []

    texts = [c["text"] for c in chunks]
    # Use nlp.pipe for faster batch CPU processing
    docs = list(nlp.pipe(texts, batch_size=32))

    for chunk, doc in zip(chunks, docs):
        doc_id = chunk["document_id"]
        chunk_id = chunk["chunk_id"]
        seen_in_chunk = set()

        # 1. Characters, Settings & Organizations
        for ent in doc.ents:
            if ent.label_ in {"PERSON", "GPE", "LOC", "ORG"}:
                ent_text = ent.text.strip()
                norm_text = ent_text.lower()
                if len(norm_text) > 2 and (norm_text, ent.label_) not in seen_in_chunk:
                    seen_in_chunk.add((norm_text, ent.label_))
                    entities.append({
                        "document_id": doc_id,
                        "chunk_id": chunk_id,
                        "entity_text": ent_text,
                        "entity_label": ent.label_,
                    })

        # 2. Literary Motifs & Thematic Concepts (2-4 word noun phrases)
        for chunk_span in doc.noun_chunks:
            phrase = chunk_span.text.strip()
            words = phrase.split()
            if 2 <= len(words) <= 4 and chunk_span.root.pos_ == "NOUN":
                norm_phrase = phrase.lower()
                # Skip phrases that duplicate named entities
                if not any(ent.text.lower() in norm_phrase for ent in doc.ents):
                    if (norm_phrase, "MOTIF") not in seen_in_chunk:
                        seen_in_chunk.add((norm_phrase, "MOTIF"))
                        entities.append({
                            "document_id": doc_id,
                            "chunk_id": chunk_id,
                            "entity_text": phrase.title(),
                            "entity_label": "MOTIF",
                        })

    return entities