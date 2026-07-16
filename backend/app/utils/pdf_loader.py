from pypdf import PdfReader
from pathlib import Path

def reflow_text(text: str) -> str:
    """
    Reflows text by merging consecutive lines that belong to the same paragraph,
    while preserving headings, lists, and empty line breaks as new paragraph boundaries.
    """
    lines = text.split("\n")
    reflowed = []
    current_para = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_para:
                reflowed.append(" ".join(current_para))
                current_para = []
            continue

        # Check if this line starts a new block
        is_heading_or_list = (
            stripped.startswith("#") or
            stripped.startswith("-") or
            stripped.startswith("*") or
            stripped.startswith("•") or
            (stripped[0].isdigit() and ("." in stripped[:5] or ")" in stripped[:5])) or
            (stripped.isupper() and len(stripped) < 80)
        )

        if is_heading_or_list:
            if current_para:
                reflowed.append(" ".join(current_para))
            current_para = [stripped]
        else:
            current_para.append(stripped)

    if current_para:
        reflowed.append(" ".join(current_para))

    return "\n\n".join([l for l in reflowed if l.strip() != ""])

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts all text from a PDF file and reflows fragments into unified paragraphs.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found at path: {pdf_path}")
        
    text_content = []
    
    with open(path, "rb") as f:
        reader = PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)
                
    raw_text = "\n\n".join(text_content)
    return reflow_text(raw_text)
