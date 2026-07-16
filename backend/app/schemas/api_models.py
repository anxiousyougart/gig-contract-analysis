from pydantic import BaseModel
from typing import Optional

class ImproveClauseRequest(BaseModel):
    clause_name: str
    original_text: str
    risk_explanation: str
    legal_reference: Optional[str] = "Indian Contract Act, 1872"

class ImproveClauseResponse(BaseModel):
    improved_text: str

class ImproveContractRequest(BaseModel):
    contract_id: Optional[str] = None
    raw_text: str
    clauses: dict
    risks: list
    missing_clauses: list

class ImproveContractResponse(BaseModel):
    improved_raw_text: str
    improved_analysis: dict
    revision_plan: list
    modified_clauses: list
    improved_structured_contract: Optional[dict] = None


