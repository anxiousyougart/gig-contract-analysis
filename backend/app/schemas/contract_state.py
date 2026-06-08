from typing import TypedDict, List, Dict, Any

class ContractState(TypedDict):
    raw_text: str

    retrieved_chunks: List[str]

    legal_context: str

    clauses: Dict[str, Any]

    risks: List[Dict[str, Any]]

    missing_clauses: List[Dict[str, Any]]

    evidence: List[Dict[str, Any]]

    fairness_score: int

    score_breakdown: Dict[str, int]

    fairness_reasoning: str

    overall_assessment: str

    recommendations: List[str]

    summary: str
