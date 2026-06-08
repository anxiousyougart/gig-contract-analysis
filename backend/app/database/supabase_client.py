import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Set up logging
logger = logging.getLogger(__name__)

# Load env variables
load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_client: Client = None

def get_supabase_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("Supabase URL or Key is missing from environment variables.")
            return None
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            _client = None
    return _client

def save_contract_to_supabase(user_id: str, filename: str, raw_text: str, analysis: dict) -> dict:
    """
    Saves the analyzed contract details to Supabase.
    Returns the inserted record or None if it fails.
    """
    client = get_supabase_client()
    if client is None:
        logger.error("Supabase client is not available. Skipping save.")
        return None

    try:
        data = {
            "user_id": user_id,
            "filename": filename,
            "raw_text": raw_text,
            "analysis": analysis
        }
        # Execute the insert
        response = client.table("contracts").insert(data).execute()
        
        # In supabase-py, response.data holds the returned rows
        if response and hasattr(response, 'data') and response.data:
            logger.info("Successfully saved contract analysis to Supabase.")
            return response.data[0]
        else:
            logger.warning("Insert returned no data. Check table/RLS permissions.")
            return None
    except Exception as e:
        logger.error(f"Error saving contract to Supabase: {e}")
        return None
