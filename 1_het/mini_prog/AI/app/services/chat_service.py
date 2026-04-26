import httpx

from app.models.models import ServiceResult, ChatRequest
from app.services.file_service import FileService
from app.config import QDRANT_URL, QDRANT_COLLECTION, GEN_MODEL, OLLAMA_URL
async def send_message_async(prompt: ChatRequest) -> ServiceResult:
    async with httpx.AsyncClient(timeout=10000) as http_client:
        # text -> embedding
        #JAVITAS
        file_service=FileService()
        vec = await file_service.embed(http_client, prompt.prompt)

        # Embedded text -> qdrant: search
        search_payload = {
            "vector": {
                "name": "summary",
                "vector": vec
            },
            "limit": 3,
            "with_payload": True
        }

        response = await http_client.post(
            f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}/points/search",
            json=search_payload
        )
        response.raise_for_status()

        data = response.json()
        results = data.get("result", [])

        #print("még jóóóó 1")

        if len(results) == 0:
            return ServiceResult.success({
                "answer": "Nem találom a dokumentumokban."
            })

        # context összeállítása
        context_parts = []

        for r in results:
            payload = r.get("payload", {})

            text = payload.get("text") or " "
            doc_name = payload.get("docName") or "doc"
            idx = payload.get("chunkText", 0)

            context_parts.append(f"[Forrás: {doc_name} #{idx}]\n{text}")

        context = "\n\n---\n\n".join(context_parts)

        #print("még jóóóó 2")

        # prompt
        final_prompt = f"""Te egy asszisztens vagy, aki KIZÁRÓLAG az alábbi KONTEKSZTUS alapján válaszol.
        Mindig azon a nyelven válaszolj, amilyen nyelven a kérdés elhangzott.
        A szavak közé tegyél szóközöket, ha kell, úgy hogy értelmesen legyenek elválasztva.
        Ha a válasz nem található a kontextusban, mondd: "Nem találom a dokumentumokban."

        KONTEKSZTUS:
        {context}

        KÉRDÉS:
        {prompt}
        """

        # Ollama generate
        gen_payload = {
            "model": GEN_MODEL,
            "prompt": final_prompt,
            "stream": False
        }

        gen_response = await http_client.post(
            f"{OLLAMA_URL}/api/generate",
            json=gen_payload
        )
        gen_response.raise_for_status()

        gen_data = gen_response.json()
        answer = gen_data.get("response") or " "

        print("A válasz:", answer)

        return ServiceResult.success({
            "answer": answer
        })