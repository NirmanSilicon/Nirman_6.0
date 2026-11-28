
from __future__ import annotations

import hashlib
from typing import TypedDict

import pymupdf


class ExtractedPage(TypedDict):
    document_id: str
    document_name: str
    page_number: int
    text: str
    has_text: bool


def extract_pdf_pages(
    pdf_bytes: bytes,
    document_name: str,
) -> list[ExtractedPage]:
    """
    Extract text from a PDF while preserving page-level provenance.

    Args:
        pdf_bytes: Contents of the PDF file.
        document_name: Original filename of the PDF.

    Returns:
        A list containing one record per PDF page.

    Raises:
        ValueError: If the PDF is empty, invalid, encrypted,
                    or the filename is missing.
    """

    if not isinstance(pdf_bytes, (bytes, bytearray)):
        raise TypeError("pdf_bytes must be bytes or bytearray.")

    if not pdf_bytes:
        raise ValueError("The uploaded PDF is empty.")

    if not document_name or not document_name.strip():
        raise ValueError("A document filename is required.")

    pdf_bytes = bytes(pdf_bytes)
    document_name = document_name.strip()

    # Generate a stable identifier for this document.
    document_id = hashlib.sha256(pdf_bytes).hexdigest()[:12]

    try:
        document = pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        )
    except Exception as error:
        raise ValueError(
            f"Could not open '{document_name}'. "
            "Please provide a valid PDF file."
        ) from error

    try:
        if document.needs_pass:
            raise ValueError(
                f"'{document_name}' is password-protected."
            )

        extracted_pages: list[ExtractedPage] = []

        for page_number, page in enumerate(document, start=1):
            # Sort improves the reading order of extracted text.
            page_text = page.get_text("text", sort=True).strip()

            extracted_pages.append(
                {
                    "document_id": document_id,
                    "document_name": document_name,
                    "page_number": page_number,
                    "text": page_text,
                    "has_text": bool(page_text),
                }
            )

        return extracted_pages

    finally:
        document.close()
