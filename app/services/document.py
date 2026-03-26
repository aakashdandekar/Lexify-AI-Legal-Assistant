from PyPDF2 import PdfReader
from io import BytesIO
from docx import Document

def pdf_to_text(contents: bytes):
    reader = PdfReader(BytesIO(contents))
    text = ""

    for page in reader.pages:
        text += page.extract_text() or ""

    return text

def docx_to_text(docx_bytes: bytes) -> str:
    doc = Document(BytesIO(docx_bytes))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text
