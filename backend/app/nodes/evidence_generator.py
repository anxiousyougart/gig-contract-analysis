from pathlib import Path
import json
from typing import Dict, Any, List
from app.schemas.contract_state import ContractState
from app.llm.groq_client import ask_groq

def repair_json_with_llm(malformed_json_str: str) -> str:
    """Uses the json_repair prompt template and Groq to repair malformed JSON."""
    try:
        repair_prompt_template = (Path(__file__).parent.parent / "prompts" / "json_repair.md").read_text()
        repair_prompt = repair_prompt_template.replace("{response}", malformed_json_str)
        repaired_response = ask_groq(repair_prompt)
        
        cleaned = repaired_response.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return cleaned
    except Exception:
        return malformed_json_str

def parse_json_safely(text: str, schema_key: str) -> Any:
    """Parses JSON robustly, incorporating standard parse, substring parse, and LLM repair."""
    cleaned = text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0].strip()
        
    # Attempt 1: Standard load
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and schema_key in data:
            return data[schema_key]
        return data
    except Exception:
        pass
        
    # Attempt 2: Extract substring between first { and last }
    try:
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1:
            data = json.loads(cleaned[start_idx:end_idx+1])
            if isinstance(data, dict) and schema_key in data:
                return data[schema_key]
            return data
    except Exception:
        pass
        
    # Attempt 3: Call JSON repair LLM
    try:
        repaired = repair_json_with_llm(cleaned)
        data = json.loads(repaired)
        if isinstance(data, dict) and schema_key in data:
            return data[schema_key]
        return data
    except Exception:
        pass
        
    # Fallback default empty structures
    return [] if schema_key == "evidence" else {}

def generate_evidence(state: ContractState) -> Dict[str, Any]:
    # Load the evidence extraction prompt template
    prompt_template = (Path(__file__).parent.parent / "prompts" / "evidence_generation.md").read_text()
    
    # Retrieve data from state
    contract_text = state.get("raw_text", "")
    risks = state.get("risks", [])
    
    # Format risks as JSON string
    risks_str = json.dumps(risks, indent=2, ensure_ascii=False)
    
    # Replace placeholders safely
    prompt = prompt_template.replace("{contract_text}", contract_text).replace("{risks}", risks_str)
    
    # Call Groq LLM
    response = ask_groq(prompt)
    
    # Parse evidence list safely using the robust JSON parser
    evidence = parse_json_safely(response, "evidence")
    
    # Ensure evidence is a list
    if not isinstance(evidence, list):
        evidence = []
        
    return {"evidence": evidence}
