# LEXICON
### Local-First AI Research & Study Intelligence Platform

LEXICON is a student-focused application for exploring and comparing information across multiple PDF documents. It combines document processing, semantic retrieval and lightweight NLP utilities in a single Streamlit workspace.

## What it includes

- **PDF processing:** Extracts page-level text while retaining document and page references.
- **Passage indexing:** Splits extracted text into overlapping, sentence-aligned chunks.
- **Semantic search:** Uses the `sentence-transformers/all-MiniLM-L6-v2` embedding model to retrieve relevant passages.
- **Entity extraction and knowledge graph:** Uses spaCy to identify people, places and organizations, then builds a NetworkX relationship graph.
- **Cross-document comparison:** Builds a comparative matrix and flags *potential* differences in related claims. Similarity or a heuristic flag is not proof of a factual contradiction; users should inspect the cited source passages.
- **Study tools:** Produces key takeaways, active-recall flashcards, a quote/device bank and a narrative/timeline view.

## Technology

- Python and Streamlit
- PyMuPDF
- Sentence Transformers (MiniLM)
- spaCy
- scikit-learn and NumPy
- NetworkX
- Plotly and pandas

The application is configured for CPU inference and does not require an NVIDIA GPU. Model files must be downloaded and cached before a fully offline run.

## Run locally

See [SETUP.md](SETUP.md) for Windows setup, dependency installation, model preparation and launch instructions.

After installing dependencies and downloading the required models:

```powershell
streamlit run app.py
```

## Repository structure

```text
.
├── app.py
├── requirements.txt
├── SETUP.md
└── src/
    ├── conflict_detector.py
    ├── embedder.py
    ├── knowledge_graph.py
    ├── matrix_builder.py
    ├── ner_extractor.py
    ├── pdf_processor.py
    ├── summarizer.py
    ├── text_processor.py
    └── timeline_extractor.py
```

## Data and privacy

PDFs are processed locally in the application session. Do not commit private documents, credentials, local model caches, virtual environments or generated datasets to the repository.

---

**NIRMAN 6.0 — HACKNATION 2026**  
**Team:** DevOps  
**Project:** LEXICON
