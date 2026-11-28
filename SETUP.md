# LEXICON — Setup and Run Guide

This guide covers local setup on Windows 10/11 using PowerShell.

## 1. Prerequisites

- 64-bit Windows 10 or 11
- Python 3.14.10 (the version used for this project)
- Git
- Visual Studio Code or another editor

## 2. Clone the team submission repository

The team submission lives in the `devops` branch of the team leader's NIRMAN fork.

```powershell
git clone -b devops https://github.com/Scarskade/Nirman_6.0.git
cd Nirman_6.0
```

## 3. Create and activate a virtual environment

```powershell
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\.venv\Scripts\Activate.ps1
```

The terminal should display `(.venv)`.

## 4. Install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The requirements file selects CPU-only PyTorch. An NVIDIA GPU and CUDA are not required.

## 5. Prepare the NLP models

Download the spaCy English model:

```powershell
python -m spacy download en_core_web_sm
```

Download and cache the sentence embedding model:

```powershell
python -c "from sentence_transformers import SentenceTransformer; model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu'); print('Model ready'); print('Embedding dimensions:', model.get_embedding_dimension())"
```

The expected embedding dimension is `384`.

**Offline note:** Both model downloads require internet access the first time. Download and verify them before using the application in an offline environment. The models are cached locally for subsequent runs. Do not delete the cache before an offline demo.

## 6. Verify the environment

```powershell
python -m pip check
python -c "import torch, streamlit, pymupdf, sentence_transformers, spacy, sklearn, networkx, plotly, pandas, numpy; print('Imports successful'); print('PyTorch:', torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

CUDA being unavailable is expected for this CPU configuration.

## 7. Launch LEXICON

From the repository root, with the virtual environment activated:

```powershell
streamlit run app.py
```

Streamlit will print the local address to open in your browser.

## 8. Repository hygiene

- Keep `.venv/`, uploaded PDFs, processed data, databases and model caches out of Git.
- Never commit API keys, passwords, access tokens or real `.env` files.
- Use `.env.example` only for non-secret placeholder configuration, if needed.
- Do not commit private or sensitive documents.
- Use `import pymupdf` for PDF processing.

---

**LEXICON — DevOps Team | NIRMAN 6.0 HACKNATION 2026**
