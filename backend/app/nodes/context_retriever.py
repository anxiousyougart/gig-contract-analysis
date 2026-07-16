from typing import Dict, Any
import logging
from app.schemas.contract_state import ContractState
from app.rag.retriever import Retriever

logger = logging.getLogger(__name__)

def retrieve_context(state: ContractState) -> Dict[str, Any]:
    clauses = state.get("clauses", {})
    
    retrieved_chunks_set = set()
    retrieved_chunks = []
    
    try:
        # We retrieve a small number of chunks per clause to avoid exceeding context limits
        retriever = Retriever(top_k=2) 
        
        for clause_name, clause_data in clauses.items():
            if isinstance(clause_data, dict) and clause_data.get("exists"):
                content = clause_data.get("content", "")
                if content:
                    # Query using clause name and a snippet of its content
                    query_text = f"{clause_name}: {content[:500]}"
                    retrieved = retriever.retrieve(query_text)
                    for chunk in retrieved:
                        text = chunk["text"]
                        # Deduplicate chunks
                        if text not in retrieved_chunks_set:
                            retrieved_chunks_set.add(text)
                            retrieved_chunks.append(text)
    except Exception as e:
        logger.error(f"Error in context retrieval node: {e}")
        
    legal_context = "\n\n".join(retrieved_chunks)
    if not legal_context:
        legal_context = "No additional legal context retrieved."
        
    return {
        "legal_context": legal_context,
        "retrieved_chunks": retrieved_chunks
    }
