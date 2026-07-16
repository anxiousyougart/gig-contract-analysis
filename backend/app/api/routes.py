import os
import tempfile
import logging
import json
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from app.graph.workflow import app as contract_graph
from app.utils.pdf_loader import extract_text_from_pdf
from app.rag.retriever import Retriever
from app.database.supabase_client import (
    save_contract_to_supabase,
    get_contracts_from_supabase,
    delete_contract_from_supabase,
    get_contract_by_id,
    update_contract_in_supabase
)
from app.schemas.api_models import (
    ImproveClauseRequest,
    ImproveClauseResponse,
    ImproveContractRequest,
    ImproveContractResponse
)
from app.llm.groq_client import ask_groq
from app.utils.doc_generator import generate_docx_from_json
from pathlib import Path

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

        # Prepare initial state for the LangGraph workflow
        initial_state = {
            "raw_text": raw_text,
            "legal_context": "",
            "retrieved_chunks": [],
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

        # Echo raw contract text so the frontend can render the contract viewer
        result["raw_text"] = raw_text

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


@router.get("/history")
async def get_history(user_id: str):
    """
    Retrieves the analysis history for a specific user.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")
    try:
        records = get_contracts_from_supabase(user_id)
        return records
    except Exception as e:
        logger.exception("Failed to retrieve contract history.")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{contract_id}")
async def delete_history_item(contract_id: str, user_id: str):
    """
    Deletes a contract analysis entry from database.
    """
    if not user_id or not contract_id:
        raise HTTPException(status_code=400, detail="Missing contract_id or user_id parameter.")
    try:
        success = delete_contract_from_supabase(contract_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contract not found or not owned by user.")
        return {"status": "success", "message": f"Contract {contract_id} deleted."}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Failed to delete history item.")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/improve-clause", response_model=ImproveClauseResponse)
async def improve_clause(payload: ImproveClauseRequest):
    """
    Rewrites a specific contract clause to address and rectify detected risks.
    Queries the vector database (RAG) for actual legal references/standards to ground the rewrite.
    """
    try:
        # Load the improve clause prompt template
        prompt_template_path = Path(__file__).parent.parent / "prompts" / "improve_clause.md"
        prompt_template = prompt_template_path.read_text()
        
        # Query vector DB matching the clause and risk explanation
        db_context = payload.legal_reference or "Indian Contract Act, 1872"
        try:
            retriever = Retriever(top_k=3)
            db_results = retriever.retrieve(f"{payload.clause_name}: {payload.risk_explanation}")
            if db_results:
                db_context = "\n\n".join([chunk["text"] for chunk in db_results])
        except Exception as db_err:
            logger.error(f"Failed to retrieve legal context for clause rewrite: {db_err}")
        
        # Replace placeholders safely
        prompt = (prompt_template
                  .replace("{clause_name}", payload.clause_name)
                  .replace("{original_text}", payload.original_text)
                  .replace("{risk_explanation}", payload.risk_explanation)
                  .replace("{legal_reference}", db_context))
        
        # Call Groq LLM
        response_text = ask_groq(prompt)
        
        # Return cleaned response
        return ImproveClauseResponse(improved_text=response_text.strip())
    except Exception as e:
        logger.exception("An error occurred during clause improvement.")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/improve", response_model=ImproveContractResponse)
async def improve_contract(payload: ImproveContractRequest):
    """
    Automatic multi-stage contract improver pipeline:
    1. Revision Planner: Structured planning using detected risks and missing clauses.
    2. Contract Rewriter: Iterative improvement of each targeted clause.
    3. Contract Composer: Clean section replacement inside the raw contract.
    4. Validator: Re-audit the improved contract to calculate the new fairness score.
    """
    try:
        # --- Stage 2: Revision Planner ---
        planner_prompt_path = Path(__file__).parent.parent / "prompts" / "revision_planner.md"
        planner_prompt_template = planner_prompt_path.read_text()
        
        # Serialize inputs safely (only send clause metadata to avoid rate/TPM limits on Groq)
        clauses_metadata = {key: {"exists": val.get("exists")} for key, val in payload.clauses.items()}
        clauses_str = json.dumps(clauses_metadata, indent=2, ensure_ascii=False)
        risks_str = json.dumps(payload.risks, indent=2, ensure_ascii=False)
        missing_clauses_str = json.dumps(payload.missing_clauses, indent=2, ensure_ascii=False)
        
        planner_prompt = (planner_prompt_template
                          .replace("{clauses}", clauses_str)
                          .replace("{risks}", risks_str)
                          .replace("{missing_clauses}", missing_clauses_str))
        
        planner_response = ask_groq(planner_prompt)
        
        # Parse revision plan JSON
        plan_data = []
        try:
            # Clean possible markdown block wraps
            cleaned_resp = planner_response.strip()
            if "```json" in cleaned_resp:
                cleaned_resp = cleaned_resp.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned_resp:
                cleaned_resp = cleaned_resp.split("```")[1].split("```")[0].strip()
            
            parsed = json.loads(cleaned_resp)
            plan_data = parsed.get("revision_plan", [])
        except Exception as pe:
            logger.error(f"Failed to parse revision plan JSON: {pe}. Response was: {planner_response}")
            # Fallback to general risks as plan
            for risk in payload.risks:
                plan_data.append({
                    "priority": risk.get("severity", "MEDIUM"),
                    "clause": risk.get("affected_clause", "Contract Clause"),
                    "reason": risk.get("explanation", ""),
                    "recommendation": "Rewrite to balance the clause terms."
                })
        
        # --- Stage 3: Contract Rewriter & Stage 4: Composer ---
        improved_text = payload.raw_text
        modified_clauses = []
        
        # Helper to find matching clause content from payload
        def find_original_clause(clause_name: str):
            norm_name = clause_name.lower().replace(" ", "_").replace("_terms", "").replace("_clause", "")
            for key, val in payload.clauses.items():
                norm_key = key.lower().replace("_", "")
                if norm_name.replace("_", "") in norm_key or norm_key in norm_name.replace("_", ""):
                    if val.get("exists") and val.get("content"):
                        return key, val.get("content")
            return clause_name, ""
        
        # Load rewriter prompt template
        rewriter_prompt_path = Path(__file__).parent.parent / "prompts" / "improve_clause.md"
        rewriter_prompt_template = rewriter_prompt_path.read_text()
        
        for item in plan_data:
            clause_title = item.get("clause", "Contract Clause")
            reason = item.get("reason", "")
            
            clause_key, original_clause_text = find_original_clause(clause_title)
            
            # Query vector DB matching this clause and planned revision
            db_context = "Indian Contract Act, 1872"
            try:
                retriever = Retriever(top_k=3)
                db_results = retriever.retrieve(f"{clause_title}: {reason}")
                if db_results:
                    db_context = "\n\n".join([chunk["text"] for chunk in db_results])
            except Exception as db_err:
                logger.error(f"Failed to retrieve legal context for planner rewrite: {db_err}")
            
            # Ask Groq to improve this specific clause
            rewriter_prompt = (rewriter_prompt_template
                              .replace("{clause_name}", clause_title)
                              .replace("{original_text}", original_clause_text)
                              .replace("{risk_explanation}", reason)
                              .replace("{legal_reference}", db_context))
            
            new_clause_text = ask_groq(rewriter_prompt).strip()
            
            if original_clause_text and original_clause_text in improved_text:
                # Composing: replace the old clause text
                improved_text = improved_text.replace(original_clause_text, new_clause_text)
                modified_clauses.append({
                    "clause_name": clause_title,
                    "old_clause": original_clause_text,
                    "new_clause": new_clause_text
                })
            else:
                # Composing: append brand new clause to the end
                improved_text += f"\n\nSection: {clause_title.upper()}\n{new_clause_text}\n"
                modified_clauses.append({
                    "clause_name": clause_title,
                    "old_clause": "",
                    "new_clause": new_clause_text
                })
                
        # --- Stage 5: Validator (Run improved contract through full audit graph again) ---
        validator_initial_state = {
            "raw_text": improved_text,
            "legal_context": "",
            "retrieved_chunks": [],
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
        
        # Run LangGraph audit on the improved contract
        validator_result = contract_graph.invoke(validator_initial_state)
        
        # --- Stage 5.5: Structure the Composed Improved Contract Text ---
        structured_contract = {}
        try:
            structurer_prompt_path = Path(__file__).parent.parent / "prompts" / "contract_structurer.md"
            structurer_prompt_template = structurer_prompt_path.read_text()
            structurer_prompt = structurer_prompt_template.replace("{contract_text}", improved_text)
            
            structurer_response = ask_groq(structurer_prompt, response_format={"type": "json_object"})
            structured_contract = json.loads(structurer_response)
        except Exception as se:
            logger.error(f"Failed to structure improved contract JSON: {se}")
            structured_contract = {
                "title": "Improved Freelance Services Agreement",
                "parties": {"client": "Client", "freelancer": "Freelancer"},
                "sections": [{"heading": "Contract Text", "content": improved_text}]
            }

        # If a contract_id was provided, update it in Supabase
        db_saved = False
        db_id = None
        if payload.contract_id:
            try:
                existing_record = get_contract_by_id(payload.contract_id)
                if existing_record:
                    updated_analysis = existing_record.get("analysis", {})
                    # Sync keys with validation findings
                    for k, v in validator_result.items():
                        if k not in ["raw_text", "id", "created_at", "filename", "db_saved"]:
                            updated_analysis[k] = v
                    updated_analysis["improved_structured_contract"] = structured_contract
                    
                    success = update_contract_in_supabase(
                        contract_id=payload.contract_id,
                        raw_text=improved_text,
                        analysis=updated_analysis
                    )
                    if success:
                        db_saved = True
                        db_id = payload.contract_id
            except Exception as db_up_err:
                logger.error(f"Failed to update contract record in database: {db_up_err}")

        # Inject metadata
        validator_result["raw_text"] = improved_text
        validator_result["db_saved"] = db_saved
        validator_result["id"] = db_id
        validator_result["filename"] = "Improved_Contract.docx"
        
        return ImproveContractResponse(
            improved_raw_text=improved_text,
            improved_analysis=validator_result,
            revision_plan=plan_data,
            modified_clauses=modified_clauses,
            improved_structured_contract=structured_contract
        )
        
    except Exception as e:
        logger.exception("Failed to run contract improver pipeline.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{contract_id}")
async def download_contract(contract_id: str):
    """
    Retrieves the structured contract from Supabase and streams it as a professionally
    formatted Microsoft Word (.docx) document.
    """
    try:
        record = get_contract_by_id(contract_id)
        if not record:
            raise HTTPException(status_code=404, detail="Contract not found.")
            
        analysis_data = record.get("analysis", {})
        structured_data = analysis_data.get("improved_structured_contract")
        
        # Fallback: if no improved version was generated, structure the original text on the fly
        if not structured_data:
            raw_text = record.get("raw_text", "")
            if not raw_text:
                raise HTTPException(status_code=400, detail="Contract text is empty.")
                
            structurer_prompt_path = Path(__file__).parent.parent / "prompts" / "contract_structurer.md"
            structurer_prompt_template = structurer_prompt_path.read_text()
            structurer_prompt = structurer_prompt_template.replace("{contract_text}", raw_text)
            
            try:
                structurer_response = ask_groq(structurer_prompt, response_format={"type": "json_object"})
                structured_data = json.loads(structurer_response)
            except Exception as se:
                logger.error(f"Failed to structure raw contract on-the-fly: {se}")
                structured_data = {
                    "title": record.get("filename", "Freelance Services Agreement").replace(".pdf", ""),
                    "parties": {"client": "Client", "freelancer": "Freelancer"},
                    "sections": [{"heading": "Contract Text", "content": raw_text}]
                }

        # Create temporary file path
        temp_dir = Path(tempfile.gettempdir())
        temp_file_path = temp_dir / f"improved_{contract_id}.docx"
        
        # Generate the formatted DOCX
        generate_docx_from_json(structured_data, str(temp_file_path))
        
        # Define clean generator to stream file contents
        def iterfile():
            with open(temp_file_path, mode="rb") as f:
                yield from f
            # Clean up the temp file after streaming completes
            try:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
            except Exception as clean_err:
                logger.error(f"Failed to remove temp file {temp_file_path}: {clean_err}")

        return StreamingResponse(
            iterfile(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=Improved_Contract.docx"}
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Failed to generate and download Word document.")
        raise HTTPException(status_code=500, detail=str(e))




