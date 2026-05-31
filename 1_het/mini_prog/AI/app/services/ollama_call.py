import httpx

from app.config import GEN_MODEL, GEN_MODEL_CLOUD, OLLAMA_API_KEY, OLLAMA_BASE_URL

async def call_llm(prompt: str) -> str:

    async with httpx.AsyncClient(timeout=300) as client:

        response = await client.post(
            f"{OLLAMA_BASE_URL}/generate",
            headers={
                "Authorization": f"Bearer {OLLAMA_API_KEY}"
            },
            json={
                "model": GEN_MODEL_CLOUD,
                "prompt": prompt,
                "stream": False
            }
        )

        response.raise_for_status()

        data = response.json()

        return data["response"]