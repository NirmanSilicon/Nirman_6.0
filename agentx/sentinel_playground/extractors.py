"""Real file and webpage extractors for PDFs, images, CSVs, and HTML."""

from __future__ import annotations

import csv
import io
from typing import Any

from bs4 import BeautifulSoup, Comment
import fitz  # PyMuPDF
from PIL import Image
import pytesseract


def extract_from_pdf(file_bytes: bytes, filename: str = "uploaded.pdf") -> dict[str, Any]:
    """Extract visible text and detect hidden white-on-white or micro-font text in a PDF."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    visible_lines: list[str] = []
    hidden_spans: list[str] = []

    for page in doc:
        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    txt = (span.get("text") or "").strip()
                    if not txt:
                        continue
                    color = int(span.get("color", 0))
                    r = (color >> 16) & 0xFF
                    g = (color >> 8) & 0xFF
                    b = color & 0xFF
                    size = float(span.get("size", 12.0))
                    is_near_white = r >= 235 and g >= 235 and b >= 235
                    is_micro = size <= 4.5
                    if is_near_white or is_micro:
                        hidden_spans.append(txt)
                    else:
                        visible_lines.append(txt)
    doc.close()

    visible_text = "\n".join(visible_lines)
    hidden_text = "\n".join(hidden_spans)
    return {
        "carrier": "pdf_upload",
        "filename": filename,
        "visible_text": visible_text,
        "hidden_text": hidden_text,
        "combined_text": f"{visible_text}\n{hidden_text}".strip(),
        "extracted_trigger": hidden_text or visible_text,
        "detection_note": (
            f"Detected {len(hidden_spans)} white-on-white / micro-font hidden PDF span(s)."
            if hidden_spans
            else "No white-on-white spans detected; parsed standard PDF text."
        ),
    }


def extract_from_image(file_bytes: bytes, filename: str = "uploaded.png") -> dict[str, Any]:
    """Run real Tesseract OCR and inspect image metadata on an uploaded image."""
    img = Image.open(io.BytesIO(file_bytes))
    ocr_text = pytesseract.image_to_string(img).strip()
    meta_notes = [
        f"{k}: {v}"
        for k, v in (img.info or {}).items()
        if isinstance(v, str) and v.strip()
    ]
    meta_text = "\n".join(meta_notes)
    combined = "\n".join(part for part in (ocr_text, meta_text) if part)
    return {
        "carrier": "image_ocr_upload",
        "filename": filename,
        "visible_text": ocr_text,
        "hidden_text": meta_text,
        "combined_text": combined,
        "extracted_trigger": combined,
        "detection_note": "Extracted text via Tesseract OCR and image metadata chunks.",
    }


def extract_from_csv(file_bytes: bytes, filename: str = "uploaded.csv") -> dict[str, Any]:
    """Parse CSV headers and rows, flagging suspicious directives inside headers."""
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    headers = rows[0] if rows else []
    body_rows = rows[1:] if len(rows) > 1 else []
    header_line = " | ".join(headers)
    body_preview = "\n".join(", ".join(r) for r in body_rows[:10])
    return {
        "carrier": "csv_upload",
        "filename": filename,
        "headers": headers,
        "visible_text": body_preview,
        "hidden_text": header_line,
        "combined_text": f"CSV Headers: {header_line}\nRows:\n{body_preview}".strip(),
        "extracted_trigger": header_line,
        "detection_note": f"Parsed {len(headers)} CSV column header(s) and {len(body_rows)} row(s).",
    }


def extract_from_html(html_text: str, source_label: str = "webpage") -> dict[str, Any]:
    """Extract visible webpage text, HTML comments (<!-- ... -->), and hidden CSS nodes."""
    soup = BeautifulSoup(html_text, "html.parser")
    page_title = soup.title.get_text(strip=True) if soup.title else source_label
    comments = [str(c).strip() for c in soup.find_all(string=lambda t: isinstance(t, Comment)) if str(c).strip()]

    hidden_dom: list[str] = []
    for tag in soup.find_all(True):
        style = (tag.get("style") or "").lower().replace(" ", "")
        if "display:none" in style or "visibility:hidden" in style or "color:#fff" in style or "color:white" in style:
            txt = tag.get_text(" ", strip=True)
            if txt:
                hidden_dom.append(txt)

    for tag in soup(["script", "style"]):
        tag.decompose()
    visible_text = soup.get_text("\n", strip=True)
    hidden_joined = "\n".join([f"<!-- {c} -->" for c in comments] + hidden_dom)
    return {
        "carrier": "webpage_scraper",
        "filename": source_label,
        "page_title": page_title,
        "byte_count": len(html_text.encode("utf-8")),
        "raw_html": html_text[:6000],
        "visible_text": visible_text,
        "hidden_text": hidden_joined,
        "combined_text": f"{visible_text}\n{hidden_joined}".strip(),
        "extracted_trigger": hidden_joined or visible_text,
        "detection_note": f"Scraped {len(html_text.encode('utf-8'))} bytes from {source_label} — found {len(comments)} HTML comment(s) and {len(hidden_dom)} hidden DOM element(s).",
    }
