import os
import sys
from fastapi.testclient import TestClient
from unittest.mock import patch

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env", override=True)

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)

# Dummy contract text
dummy_text = """# Freelance Web Development Agreement

This Freelance Web Development Agreement (the "Agreement") is entered into by and between the parties.

## Scope of Work

The Freelancer shall design and develop a responsive company website consisting of up to five pages.

## Payment Terms

The Client agrees to pay the Freelancer a total fee of ₹50,000. Fifty percent (50%) shall be paid before work begins and the remaining fifty percent (50%) shall be paid within seven (7) days of final delivery.

## Termination

Either party may terminate this Agreement by providing fourteen (14) days written notice to the other party. The Client shall pay for all work completed up to the termination date.
"""

def test_analyze_endpoint():
    print("Testing /api/analyze endpoint...")
    
    # Mock extract_text_from_pdf and save_contract_to_supabase
    # to avoid needing a real PDF and a real Supabase insert for testing.
    with patch("app.api.routes.extract_text_from_pdf", return_value=dummy_text) as mock_extract, \
         patch("app.api.routes.save_contract_to_supabase", return_value={"id": "mock-uuid-123-abc", "created_at": "2026-06-08T06:00:00Z"}) as mock_db:
        
        # Send a mock file upload request
        dummy_file_content = b"%PDF-1.4 ... mock pdf bytes ..."
        response = client.post(
            "/api/analyze",
            files={"file": ("test_agreement.pdf", dummy_file_content, "application/pdf")},
            data={"user_id": "00000000-0000-0000-0000-000000000000"}
        )
        
        print("Status Code:", response.status_code)
        
        if response.status_code != 200:
            print("Response text:", response.text)
            assert False, f"Request failed with status code {response.status_code}"
            
        data = response.json()
        print("\nAPI Response Structure Keys:", data.keys())
        print("Fairness Score:", data.get("fairness_score"))
        print("Overall Assessment:", data.get("overall_assessment"))
        print("DB Saved status:", data.get("db_saved"))
        print("Returned DB UUID:", data.get("id"))
        
        # Validate returned keys
        assert "clauses" in data, "clauses missing from response"
        assert "risks" in data, "risks missing from response"
        assert "fairness_score" in data, "fairness_score missing from response"
        assert data.get("id") == "mock-uuid-123-abc", "Returned ID does not match mock"
        assert data.get("db_saved") is True, "db_saved is not True"
        
        print("\nTest passed successfully!")

if __name__ == "__main__":
    test_analyze_endpoint()
