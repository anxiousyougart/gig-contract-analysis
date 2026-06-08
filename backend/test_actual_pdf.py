import os
import sys
import json
import argparse
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv(dotenv_path="../.env", override=True)

# Force test run to use llama-3.1-8b-instant model to bypass token rate limits
os.environ["GROQ_MODEL"] = "llama-3.1-8b-instant"

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.pdf_loader import extract_text_from_pdf
from app.rag.retriever import Retriever
from app.graph.workflow import app as contract_graph
from app.database.supabase_client import save_contract_to_supabase

def test_pipeline(pdf_path: str, user_id: str):
    print(f"1. Extracting text from PDF: {pdf_path}")
    raw_text = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(raw_text)} characters.")
    
    print("\n2. Retrieving RAG context using Retriever...")
    retriever = Retriever(top_k=5)
    query_text = raw_text[:1000]
    retrieved = retriever.retrieve(query_text)
    retrieved_chunks = [chunk["text"] for chunk in retrieved]
    legal_context = "\n\n".join(retrieved_chunks)
    print(f"Retrieved {len(retrieved_chunks)} chunks from FAISS vector store.")
    
    # Prepare state
    initial_state = {
        "raw_text": raw_text,
        "legal_context": legal_context,
        "retrieved_chunks": retrieved_chunks,
        "clauses": {},
        "risks": [],
        "missing_clauses": [],
        "evidence": [],
        "fairness_score": 0,
        "score_breakdown": {},
        "fairness_reasoning": "",
        "overall_assessment": "",
        "recommendations": [],
        "summary": ""
    }
    
    print("\n3. Invoking LangGraph workflow (running nodes)...")
    result = contract_graph.invoke(initial_state)
    print("Graph execution complete!")
    
    print(f"\n4. Saving results to Supabase for user_id: {user_id}...")
    saved_record = save_contract_to_supabase(
        user_id=user_id,
        filename=os.path.basename(pdf_path),
        raw_text=raw_text,
        analysis=result
    )
    
    if saved_record:
        print("\nSUCCESS: Saved contract record to Supabase!")
        print("Database Row ID:", saved_record.get("id"))
        print("Created At:", saved_record.get("created_at"))
    else:
        print("\nFAILED to save to Supabase. Checking database permissions, connection, or user_id mapping.")
        print("Please verify your user_id exists in the auth.users table or if there are active RLS policies on the 'contracts' table.")
        
    print("\n=== FINAL ANALYSIS RESULT ===")
    print("Fairness Score:", result.get("fairness_score"))
    print("Overall Assessment:", result.get("overall_assessment"))
    print("Number of Clauses Extracted:", len(result.get("clauses", {})))
    print("Number of Risks Detected:", len(result.get("risks", [])))
    print("Number of Missing Clauses:", len(result.get("missing_clauses", [])))
    print("Number of Evidence Mappings:", len(result.get("evidence", [])))

def resolve_test_user_id() -> str:
    from app.database.supabase_client import get_supabase_client
    client = get_supabase_client()
    if not client:
        return "00000000-0000-0000-0000-000000000000"
    
    email = "test.analyzer.user.123@gmail.com"
    password = "supersecurepassword123"
    
    try:
        # Try signing up first
        res = client.auth.sign_up({"email": email, "password": password})
        if res and res.user:
            return res.user.id
    except Exception:
        # If already registered, sign in to retrieve the user ID
        try:
            res = client.auth.sign_in_with_password({"email": email, "password": password})
            if res and res.user:
                return res.user.id
        except Exception as signin_err:
            print(f"Warning: Failed to sign in / resolve auth user: {signin_err}")
            
    # Fallback to the known working user ID
    return "123e0907-7219-4fdc-97ab-dffa6d0771e6"

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test actual PDF analysis end-to-end.")
    parser.add_argument("--pdf", type=str, default="../Freelance_Contract_TechSolutions_Priya.pdf", help="Path to PDF file.")
    parser.add_argument("--user_id", type=str, default=None, help="UUID of user in auth.users (resolves automatically if not provided).")
    args = parser.parse_args()
    
    user_id = args.user_id if args.user_id else resolve_test_user_id()
    print(f"Resolved test user ID: {user_id}")
    test_pipeline(args.pdf, user_id)
