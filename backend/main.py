import os
import logging
# Force reload to pick up GROQ_MODEL and clause extractor updates
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

# Load environment variables
load_dotenv(dotenv_path="../.env", override=True)

from app.api.routes import router as api_router
from app.rag.knowledge_loader import KnowledgeLoader

app = FastAPI(
    title="LexFlow AI Contract Analysis API",
    description="API for extracting clauses, detecting risks, scoring fairness, and retrieving legal evidence for freelance agreements.",
    version="1.0.0"
)

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routes
app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Gig Contract Analysis API...")
    try:
        # Pre-warm the RAG retriever (auto-builds index if missing)
        logger.info("Initializing/Pre-warming RAG Vector Store and Model...")
        KnowledgeLoader.load_existing()
        logger.info("RAG Vector Store successfully initialized and pre-warmed.")
    except Exception as e:
        logger.exception("Failed to initialize FAISS index / RAG store during startup.")

@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Gig Contract Analysis API is running"
    }

if __name__ == "__main__":
    import uvicorn
    # Start the server
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
