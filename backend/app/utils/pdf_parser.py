from __future__ import annotations
from pypdf import PdfReader
from io import BytesIO

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts all text from a PDF byte stream."""
    try:
        reader = PdfReader(BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text.strip()
    except Exception as e:
        print(f"[PDF_ERROR] Could not extract text: {e}")
        return ""
