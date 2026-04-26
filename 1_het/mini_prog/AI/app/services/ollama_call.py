import httpx

async def call_llm(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=400) as client:
        response = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3",
                "prompt": prompt,
                "stream": False
            }
        )
        response.raise_for_status()
        data = response.json()
        return data["response"]