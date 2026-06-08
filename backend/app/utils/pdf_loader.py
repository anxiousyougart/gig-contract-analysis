
from pypdf import PdfReader
from pathlib import Path

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extracts all text from a PDF file.
    
    Args:
        pdf_path (str): The absolute or relative path to the PDF file.
        
    Returns:
        str: The extracted text content.
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
                
    return "\n\n".join(text_content)
