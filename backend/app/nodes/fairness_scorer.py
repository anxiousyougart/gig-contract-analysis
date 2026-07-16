from pathlib import Path
import json
from typing import Dict, Any
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
        return data
    except Exception:
        pass
        
    # Attempt 2: Extract substring between first { and last }
    try:
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1:
            return json.loads(cleaned[start_idx:end_idx+1])
    except Exception:
        pass
        
    # Attempt 3: Call JSON repair LLM
    try:
        repaired = repair_json_with_llm(cleaned)
        return json.loads(repaired)
    except Exception:
        pass
        
    # Fallback default empty structures
    return {}

def score_fairness(state: ContractState) -> Dict[str, Any]:
    # Load the fairness scorer prompt template
    prompt_template = (Path(__file__).parent.parent / "prompts" / "fairness_scoring.md").read_text()
    
    # Retrieve data from state
    clauses = state.get("clauses", {})
    risks = state.get("risks", [])
    missing_clauses = state.get("missing_clauses", [])
    legal_context = state.get("legal_context", "")
    
    # Format objects as JSON strings
    clauses_str = json.dumps(clauses, indent=2, ensure_ascii=False)
    risks_str = json.dumps(risks, indent=2, ensure_ascii=False)
    missing_clauses_str = json.dumps(missing_clauses, indent=2, ensure_ascii=False)
    
    # Replace placeholders safely
    prompt = (prompt_template
              .replace("{legal_context}", legal_context)
              .replace("{clauses}", clauses_str)
              .replace("{risks}", risks_str)
              .replace("{missing_clauses}", missing_clauses_str))
    
    # Call Groq LLM
    response = ask_groq(prompt)
    
    # Parse output safely
    scoring_data = parse_json_safely(response, "fairness_score")
    
    # Extract all scoring fields
    fairness_score = 0
    score_breakdown = {}
    reasoning = ""
    overall_assessment = ""
    
    if isinstance(scoring_data, dict):
        fairness_score = scoring_data.get("fairness_score", 0)
        score_breakdown = scoring_data.get("score_breakdown", {})
        reasoning = scoring_data.get("reasoning", "")
        overall_assessment = scoring_data.get("overall_assessment", "")
    elif isinstance(scoring_data, (int, float)):
        fairness_score = int(scoring_data)
        
    return {
        "fairness_score": fairness_score,
        "score_breakdown": score_breakdown,
        "fairness_reasoning": reasoning,
        "overall_assessment": overall_assessment
    }
