from groq import Groq
import os

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def ask_groq(prompt, max_tokens=1000):

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1,
        max_tokens=max_tokens
    )

    return response.choices[0].message.content
