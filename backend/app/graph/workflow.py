from langgraph.graph import StateGraph, START, END
from app.graph.state import ContractState
from app.nodes.clause_extractor import extract_clauses
from app.nodes.risk_detector import detect_risks
from app.nodes.missing_clause_detector import detect_missing_clauses
from app.nodes.fairness_scorer import score_fairness
from app.nodes.evidence_generator import generate_evidence
from app.nodes.context_retriever import retrieve_context

# 1. Initialize StateGraph with the shared ContractState
workflow = StateGraph(ContractState)

# 2. Register Nodes
workflow.add_node("extractor", extract_clauses)
workflow.add_node("risk_detector", detect_risks)
workflow.add_node("missing_clause_detector", detect_missing_clauses)
workflow.add_node("context_retriever", retrieve_context)
workflow.add_node("fairness_scorer", score_fairness)
workflow.add_node("evidence_generator", generate_evidence)

# 3. Add Connections / Edges
# Start -> Clause Extractor
workflow.add_edge(START, "extractor")

# Clause Extractor -> Context Retriever
workflow.add_edge("extractor", "context_retriever")

# Context Retriever -> Risk Detector & Missing Clause Detector (simultaneous execution)
workflow.add_edge("context_retriever", "risk_detector")
workflow.add_edge("context_retriever", "missing_clause_detector")

# Parallel nodes fan-in (join) -> Fairness Scorer
workflow.add_edge("risk_detector", "fairness_scorer")
workflow.add_edge("missing_clause_detector", "fairness_scorer")

# Fairness Scorer -> Evidence Generator
workflow.add_edge("fairness_scorer", "evidence_generator")

# Evidence Generator -> END
workflow.add_edge("evidence_generator", END)

# 4. Compile the graph
app = workflow.compile()
