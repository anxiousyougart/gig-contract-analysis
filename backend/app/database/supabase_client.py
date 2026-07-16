import os
import logging
import threading
from dotenv import load_dotenv

# Set up logging
logger = logging.getLogger(__name__)

# Load env variables
load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_client = None
_client_lock = threading.Lock()
_init_attempted = False

def _create_client_with_timeout(timeout: float = 5.0):
    """
    Attempts to create a Supabase client within a timeout window.
    Returns the client or None if it times out / fails.
    """
    result = [None]
    error = [None]

    def _init():
        try:
            from supabase import create_client
            result[0] = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            error[0] = e

    t = threading.Thread(target=_init, daemon=True)
    t.start()
    t.join(timeout=timeout)

    if t.is_alive():
        logger.warning(
            f"Supabase client initialization timed out after {timeout}s. "
            "Continuing without database persistence."
        )
        return None

    if error[0]:
        logger.error(f"Failed to initialize Supabase client: {error[0]}")
        return None

    return result[0]


def get_supabase_client():
    global _client, _init_attempted

    with _client_lock:
        if _init_attempted:
            return _client

        _init_attempted = True

        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning(
                "Supabase URL or Key is missing from environment variables. "
                "Database persistence is disabled."
            )
            return None

        _client = _create_client_with_timeout(timeout=5.0)
        if _client:
            logger.info("Supabase client initialized successfully.")
        return _client


def save_contract_to_supabase(user_id: str, filename: str, raw_text: str, analysis: dict) -> dict:
    """
    Saves the analyzed contract details to Supabase.
    Returns the inserted record or None if it fails.
    """
    client = get_supabase_client()
    if client is None:
        logger.warning("Supabase client is not available. Skipping save.")
        return None

    try:
        data = {
            "user_id": user_id,
            "filename": filename,
            "raw_text": raw_text,
            "analysis": analysis
        }
        response = client.table("contracts").insert(data).execute()

        if response and hasattr(response, 'data') and response.data:
            logger.info("Successfully saved contract analysis to Supabase.")
            return response.data[0]
        else:
            logger.warning("Insert returned no data. Check table/RLS permissions.")
            return None
    except Exception as e:
        logger.error(f"Error saving contract to Supabase: {e}")
        return None


def get_contracts_from_supabase(user_id: str) -> list:
    """
    Fetches the history of analyzed contracts for a specific user ID from Supabase.
    """
    client = get_supabase_client()
    if client is None:
        logger.warning("Supabase client is not available. Skipping fetch.")
        return []

    try:
        response = client.table("contracts").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if response and hasattr(response, 'data') and response.data is not None:
            logger.info(f"Successfully retrieved {len(response.data)} records from Supabase.")
            return response.data
        return []
    except Exception as e:
        logger.error(f"Error fetching contracts from Supabase: {e}")
        return []


def delete_contract_from_supabase(contract_id: str, user_id: str) -> bool:
    """
    Deletes an analyzed contract record by ID for a specific user ID.
    """
    client = get_supabase_client()
    if client is None:
        logger.warning("Supabase client is not available. Skipping delete.")
        return False

    try:
        response = client.table("contracts").delete().eq("id", contract_id).eq("user_id", user_id).execute()
        if response and hasattr(response, 'data') and response.data:
            logger.info(f"Successfully deleted contract {contract_id} from Supabase.")
            return True
        logger.warning(f"Delete returned no matching record for ID {contract_id} and User {user_id}.")
        return False
    except Exception as e:
        logger.error(f"Error deleting contract from Supabase: {e}")
        return False


def get_contract_by_id(contract_id: str) -> dict:
    """
    Retrieves a single contract record by its UUID.
    """
    client = get_supabase_client()
    if client is None:
        logger.warning("Supabase client is not available. Skipping fetch.")
        return None

    try:
        response = client.table("contracts").select("*").eq("id", contract_id).execute()
        if response and hasattr(response, 'data') and response.data:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching contract by ID: {e}")
        return None


def update_contract_in_supabase(contract_id: str, raw_text: str, analysis: dict) -> bool:
    """
    Updates an existing contract record's text and analysis dictionary in Supabase.
    """
    client = get_supabase_client()
    if client is None:
        logger.warning("Supabase client is not available. Skipping update.")
        return False

    try:
        data = {
            "raw_text": raw_text,
            "analysis": analysis
        }
        response = client.table("contracts").update(data).eq("id", contract_id).execute()
        if response and hasattr(response, 'data') and response.data:
            logger.info(f"Successfully updated contract {contract_id} in Supabase.")
            return True
        return False
    except Exception as e:
        logger.error(f"Error updating contract in Supabase: {e}")
        return False


