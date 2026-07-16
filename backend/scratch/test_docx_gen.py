import sys
import os
from pathlib import Path

# Add backend app directory to sys.path so we can import modules
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.doc_generator import generate_docx_from_json

def test_gen():
    sample_data = {
        "title": "SOFTWARE DEVELOPMENT AGREEMENT",
        "parties": {
            "client": "Acme Corporation Inc.",
            "freelancer": "Jane Doe"
        },
        "sections": [
            {
                "heading": "Scope of Work",
                "content": "Jane Doe agrees to develop a web-based document editing application according to the specifications outlined in Appendix A."
            },
            {
                "heading": "Payment Terms",
                "content": "Client shall pay Freelancer a total sum of $10,000 USD upon completion of all milestones. Progress payments shall be paid in instalments."
            },
            {
                "heading": "Termination",
                "content": "Either party may terminate this agreement with at least 30 days prior written notice."
            }
        ]
    }
    
    scratch_dir = Path(__file__).parent
    output_docx = scratch_dir / "test_output.docx"
    
    print(f"Generating DOCX to {output_docx}...")
    generate_docx_from_json(sample_data, str(output_docx))
    
    if output_docx.exists():
        print("Success! Test DOCX generated successfully.")
        print(f"File size: {output_docx.stat().st_size} bytes")
    else:
        print("Error: Document file was not created.")

if __name__ == "__main__":
    test_gen()
