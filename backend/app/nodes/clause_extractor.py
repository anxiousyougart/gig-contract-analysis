from pathlib import Path
import json
from typing import Dict, Any
from app.schemas.contract_state import ContractState
from app.llm.groq_client import ask_groq

def extract_clauses(state: ContractState) -> Dict[str, Any]:
    # Load the prompt template as instructed
    # prompt_template = (Path(__file__).parent.parent / "prompts" / "clause_extraction.md").read_text()
    prompt_template = Path(r"C:\Users\User\Documents\Projects\gig-contract-analysis\backend\app\prompts\clause_extraction.md").read_text()
    
    # Get raw text from state
    contract_text = state.get("raw_text", "")
    
    # Safely replace placeholders since prompt_template contains JSON braces
    prompt = prompt_template.replace("{contract_text}", contract_text)
    
    # Call Groq LLM
    response = ask_groq(prompt, max_tokens=4096)
    
    # Parse LLM response to JSON
    cleaned_response = response.strip()
    
    # Remove markdown code fences if present
    if "```json" in cleaned_response:
        cleaned_response = cleaned_response.split("```json")[1].split("```")[0].strip()
    elif "```" in cleaned_response:
        cleaned_response = cleaned_response.split("```")[1].split("```")[0].strip()
        
    try:
        clauses = json.loads(cleaned_response)
        if isinstance(clauses, dict) and "clauses" in clauses:
            clauses = clauses["clauses"]
    except Exception as parse_error:
        # Robust parsing fallback
        try:
            start_idx = cleaned_response.find("{")
            end_idx = cleaned_response.rfind("}")
            if start_idx != -1 and end_idx != -1:
                clauses = json.loads(cleaned_response[start_idx:end_idx+1])
                if isinstance(clauses, dict) and "clauses" in clauses:
                    clauses = clauses["clauses"]
            else:
                raise parse_error
        except Exception:
            clauses = {}
            
    # Return the updated clauses key to update the state
    return {"clauses": clauses}
