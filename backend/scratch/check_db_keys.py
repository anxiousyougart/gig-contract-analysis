import os
import sys
from dotenv import load_dotenv

# Load env
load_dotenv(dotenv_path="../.env", override=True)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.supabase_client import get_supabase_client

client = get_supabase_client()
if client:
    res = client.table("contracts").select("*").order("created_at", desc=True).limit(1).execute()
    if res.data:
        contract = res.data[0]
        analysis = contract.get("analysis", {})
        clauses = analysis.get("clauses", {})
        risks = analysis.get("risks", {})
        
        print("MOST RECENT CONTRACT:")
        print("Filename:", contract.get("filename"))
        print("\nClauses Keys:")
        print(list(clauses.keys()))
        print("\nRisks Affected Clauses:")
        for r in risks:
            print(f"- Risk: {r.get('risk_name')} -> Affected Clause: {r.get('affected_clause')}")
    else:
        print("No contracts found in Supabase.")
else:
    print("Supabase client failed to initialize.")
