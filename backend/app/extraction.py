"""Turn an uploaded incident document (PDF / TXT / EML) into plain text."""
import email
from email import policy
from io import BytesIO

from pypdf import PdfReader


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        reader = PdfReader(BytesIO(data))
        pages = [(p.extract_text() or "") for p in reader.pages]
        text = "\n\n".join(pages).strip()
        if not text:
            raise ValueError("No selectable text found in this PDF (it may be a scanned image). Paste the text instead.")
        return text
    if name.endswith(".eml"):
        msg = email.message_from_bytes(data, policy=policy.default)
        header = f"From: {msg['from']}\nTo: {msg['to']}\nDate: {msg['date']}\nSubject: {msg['subject']}\n\n"
        body = msg.get_body(preferencelist=("plain", "html"))
        return header + (body.get_content() if body else "")
    return data.decode("utf-8", errors="ignore").strip()
