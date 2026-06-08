import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(dotenv_path="../.env", override=True)

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.nodes.clause_extractor import extract_clauses
from app.schemas.contract_state import ContractState

raw_text = """# Freelance Web Development Agreement

## Scope of Work

The Freelancer shall design and develop a responsive company website consisting of up to five pages, including a homepage, services page, about page, contact page, and blog page.

## Payment Terms

The Client agrees to pay the Freelancer a total fee of ₹50,000. Fifty percent (50%) shall be paid before work begins and the remaining fifty percent (50%) shall be paid within seven (7) days of final delivery.

## Project Timeline

The Freelancer shall deliver the completed website within thirty (30) days from the project start date.

## Revisions

The Client is entitled to two rounds of revisions. Additional revisions shall be billed separately at the Freelancer's standard hourly rate.

## Confidentiality

Both parties agree to keep confidential any proprietary or business information disclosed during the course of this Agreement.

## Intellectual Property

Upon receipt of full payment, all ownership rights in the final website deliverables shall transfer to the Client. The Freelancer retains ownership of any pre-existing tools, templates, or frameworks used in the project.

## Termination

Either party may terminate this Agreement by providing fourteen (14) days written notice to the other party. The Client shall pay for all work completed up to the termination date.

## Governing Law

This Agreement shall be governed by and construed in accordance with the laws of India. Any disputes arising from this Agreement shall be subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana.
"""

legal_context = "Under Section 73 of the Indian Contract Act, 1872, compensation is due for breach of contract. Section 27 invalidates agreements in restraint of trade (non-competes are generally unenforceable post-termination in India)."

# Prepare state
state: ContractState = {
    "raw_text": raw_text,
    "legal_context": legal_context,
    "retrieved_chunks": [],
    "clauses": {},
    "risks": [],
    "missing_clauses": [],
    "evidence": [],
    "fairness_score": 0,
    "recommendations": [],
    "summary": ""
}

print("Running clause extraction...")
try:
    result = extract_clauses(state)
    print("Extraction completed successfully!")
    print(json.dumps(result, indent=2, ensure_ascii=True))
except Exception as e:
    print(f"Error occurred: {e}")
    import traceback
    traceback.print_exc()
