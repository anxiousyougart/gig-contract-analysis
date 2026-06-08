import os
import tempfile
import logging
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse

from app.graph.workflow import app as contract_graph
from app.utils.pdf_loader import extract_text_from_pdf
from app.rag.retriever import Retriever
from app.database.supabase_client import save_contract_to_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze")
async def analyze_contract(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """
    Extracts text from the uploaded PDF, retrieves relevant legal context from
    the RAG database, feeds it to the LangGraph workflow, saves the analysis
    to Supabase under the specified user_id, and returns the analysis.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        # Create a temp file to store the upload safely
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
            # Write uploaded content to temp file
            content = await file.read()
            temp_file.write(content)

        # Extract text from PDF
        try:
            raw_text = extract_text_from_pdf(temp_path)
        except Exception as ext_err:
            logger.error(f"Error extracting text from PDF: {ext_err}")
            raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(ext_err)}")
        finally:
            # Clean up the temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="PDF content is empty or could not be extracted.")

        # RAG Context Retrieval
        try:
            retriever = Retriever(top_k=5)
            # Use the first 1000 characters of the contract as query text for similarity search
            query_text = raw_text[:1000]
            retrieved = retriever.retrieve(query_text)
            retrieved_chunks = [chunk["text"] for chunk in retrieved]
            legal_context = "\n\n".join(retrieved_chunks)
        except Exception as e:
            logger.error(f"Failed to retrieve RAG context: {e}")
            retrieved_chunks = []
            legal_context = "No additional legal context retrieved."

        # Prepare initial state for the LangGraph workflow
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

        # Invoke the LangGraph workflow
        result = contract_graph.invoke(initial_state)

        # Save results to Supabase (catch and log database failures to keep endpoint working)
        saved_record = None
        try:
            saved_record = save_contract_to_supabase(
                user_id=user_id,
                filename=file.filename,
                raw_text=raw_text,
                analysis=result
            )
        except Exception as db_err:
            logger.error(f"Database save error: {db_err}")

        # Inject DB metadata directly into the result dictionary to match expectations
        result["db_saved"] = saved_record is not None
        if saved_record:
            result["id"] = saved_record.get("id")
            result["created_at"] = saved_record.get("created_at")
            result["filename"] = file.filename
        else:
            result["id"] = None
            result["created_at"] = None
            result["filename"] = file.filename

        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("An error occurred during contract analysis.")
        raise HTTPException(status_code=500, detail=str(e))
