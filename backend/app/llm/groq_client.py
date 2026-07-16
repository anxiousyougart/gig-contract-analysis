from groq import Groq, APIStatusError
import os
import time
import logging

logger = logging.getLogger(__name__)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def ask_groq(prompt, max_tokens=4096, response_format=None, max_retries=3):
    current_max_tokens = max_tokens
    
    for attempt in range(max_retries):
        kwargs = {
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.1,
            "max_tokens": current_max_tokens
        }
        
        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except APIStatusError as e:
            # 413: Payload too large (Requested tokens > TPM Limit)
            # 429: Rate limit exceeded (Too many requests / TPM exhausted)
            if e.status_code in [413, 429]:
                logger.warning(f"Groq API rate limit or size error (Status {e.status_code}): {e.message}")
                
                # If it's 413, try reducing the max_tokens to see if it fits the TPM limit
                if e.status_code == 413 and current_max_tokens > 512:
                    current_max_tokens = current_max_tokens // 2
                    logger.info(f"Reducing max_tokens to {current_max_tokens} and retrying...")
                else:
                    # Exponential backoff for 429 or if we can't reduce tokens further
                    sleep_time = 2 ** attempt * 2 # 2s, 4s, 8s
                    logger.info(f"Waiting {sleep_time} seconds before retrying...")
                    time.sleep(sleep_time)
                
                if attempt == max_retries - 1:
                    logger.error("Max retries reached for Groq API. Raising exception.")
                    raise
            else:
                # Re-raise for other API errors (e.g. 400 Bad Request, 401 Auth)
                raise
