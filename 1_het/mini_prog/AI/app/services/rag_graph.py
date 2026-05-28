'''from typing import TypedDict, List
import httpx
import json

from langgraph.graph import StateGraph, END, START

from app.config import QDRANT_URL, QDRANT_COLLECTION, GEN_MODEL, OLLAMA_URL
from app.services.file_service import FileService


class RagState(TypedDict, total=False):
    question: str
    rephrased_question:str

    question_type: str
    search_vectors: List[str]

    vector: List[float]

    results: List[dict]
    top_results: List[dict]

    context: str
    answer: str


async def classify_question(state: RagState) -> RagState:   
    question = state["question"]

    classifier_prompt = f"""
    Feladat:
    Osztályozd a felhasználói kérdést RAG keresési szempontból.

    Lehetséges kategóriák:

    1. code
    Akkor válaszd, ha a kérdés konkrét kódra, függvényre, osztályra, metódusra,
    hibára, importra, API-ra, routerre, service-re, változóra vagy implementációra kérdez.

    2. summary
    Akkor válaszd, ha a kérdés azt kéri, hogy magyarázd el, mit csinál egy komponens,
    fájl, osztály, metódus vagy folyamat.

    3. text
    Akkor válaszd, ha dokumentációra, README-re, telepítésre, konfigurációra,
    leírásra vagy használati útmutatóra kérdez.

    4. general
    Akkor válaszd, ha nem egyértelmű, vagy többféle keresés is indokolt.

    A válaszod KIZÁRÓLAG érvényes JSON legyen, semmi más.

    Formátum:
    {{
    "question_type": "code | summary | text | general",
    "search_vectors": ["code", "summary", "text"]
    }}

    Szabályok:
    - code kérdésnél: ["code", "summary"]
    - summary kérdésnél: ["summary", "code", "text"]
    - text kérdésnél: ["text", "summary"]
    - general kérdésnél: ["summary", "code", "text"]

    Kérdés:
    {question}
    """

    payload = {
        "model": GEN_MODEL,
        "prompt": classifier_prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=10000) as http_client:
            response = await http_client.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload
            )
            response.raise_for_status()

        data = response.json()
        raw_answer = data.get("response", "").strip()

        parsed = json.loads(raw_answer)

        question_type = parsed.get("question_type", "general")
        search_vectors = parsed.get("search_vectors", ["summary", "code", "text"])

        allowed_types = {"code", "summary", "text", "general"}
        allowed_vectors = {"code", "summary", "text"}

        if question_type not in allowed_types:
            question_type = "general"

        search_vectors = [
            vector for vector in search_vectors
            if vector in allowed_vectors
        ]

        if not search_vectors:
            search_vectors = ["summary", "code", "text"]

        return {
            **state,
            "question_type": question_type,
            "search_vectors": search_vectors
        }

    except Exception:
        return {
            **state,
            "question_type": "general",
            "search_vectors": ["summary", "code", "text"]
        }

async def rephrase_question(state: RagState) ->RagState:
    start_question=state["question"]
    
    rewrite_prompt = f"""
    Feladat:
    A felhasználói kérdést alakítsd át egy olyan keresési lekérdezéssé,
    ami a lehető leghatékonyabb vector adatbázis keresést eredményezi
    egy programkódokat és dokumentációt tartalmazó RAG rendszerben.

    Cél:
    - Javítsd a szemantikus keresést
    - Emeld ki a fontos technikai fogalmakat
    - Egészítsd ki releváns szinonimákkal
    - Használj fejlesztői terminológiát
    - Tartsd meg az eredeti jelentést
    - Ne válaszolj a kérdésre
    - Ne magyarázz
    - Csak a keresési lekérdezést add vissza

    Szabályok:
    - Rövid, tömör keresési szöveg legyen
    - Tartalmazhat kulcsszavakat
    - Tartalmazhat technikai fogalmakat
    - Tartalmazhat kapcsolódó komponens neveket
    - Tartalmazhat framework neveket
    - Tartalmazhat programozási fogalmakat
    - Ne használj markdown formázást
    - Ne írj teljes mondatokat, ha nem szükséges
    - A válaszod CSAK a keresési lekérdezés legyen
    - Ne írj bevezetőt
    - Ne írj magyarázatot
    - Ne használj idézőjeleket
    - Ha a kérdésben szerepel osztály, függvény vagy fájlnév,
    azt mindig tartsd meg a keresési lekérdezésben
    
    Kérdés típus viselkedés:
    - code:
    fókuszálj:
    - függvényekre
    - osztályokra
    - implementációra
    - API-kra
    - változónevekre
    - source code fogalmakra

    - summary:
    fókuszálj:
    - architektúrára
    - komponensekre
    - működésre
    - felelősségekre
    - folyamatokra

    - text:
    fókuszálj:
    - dokumentációra
    - konfigurációra
    - telepítésre
    - használatra
    - README jellegű fogalmakra

    - general:
    használj vegyes technikai és dokumentációs kulcsszavakat

    Példák:

    Kérdés:
    "hol van az auth?"

    Keresési lekérdezés:
    authentication auth login jwt token authorization middleware AuthService
    ---
    Kérdés:
    "mit csinál a file upload?"

    Keresési lekérdezés:
    file upload UploadFile multipart form-data file_service upload_qdrant_async FastAPI endpoint
    ---
    Kérdés:
    "hogy működik a router?"

    Keresési lekérdezés:
    FastAPI router APIRouter endpoint route request handler controller API routing
    ---
    Felhasználói kérdés:
    {start_question}
    
    Kérdés típusa:
    {state['question_type']}
    """
    
    payload = {
        "model": GEN_MODEL,
        "prompt": rewrite_prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=10000) as http_client:
            response = await http_client.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            data = response.json()

            rewritten_query = data.get("response", "").strip()
            
            return{
                **state,
                "rephrased_question":rewritten_query
            }
    except Exception:
        return {
            **state,
            "rephrased_question":start_question
        }
    

    
async def embed_question(state: RagState) -> RagState:
    async with httpx.AsyncClient(timeout=10000) as http_client:
        file_service = FileService()
        vector = await file_service.embed(http_client, state["question"])

    return {
        **state,
        "vector": vector
    }


async def search_vector(
    vector_name: str,
    vector: List[float],
    http_client: httpx.AsyncClient
) -> List[dict]:
    search_payload = {
        "vector": {
            "name": vector_name,
            "vector": vector
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
    return data.get("result", [])




async def search_qdrant(state: RagState) -> RagState:
    vector = state["vector"]
    search_vectors = state.get("search_vectors", ["summary", "code", "text"])

    results = []

    async with httpx.AsyncClient(timeout=10000) as http_client:
        for vector_name in search_vectors:
            vector_results = await search_vector(
                vector_name=vector_name,
                vector=vector,
                http_client=http_client
            )

            for result in vector_results:
                result["matched_vector"] = vector_name
                results.append(result)
    print("RESULTS:", len(results))
    return {
        **state,
        "results": results
    }


async def filter_results(state: RagState) -> RagState:
    results = state.get("results", [])

    top_results = sorted(
        [r for r in results if r.get("score", 0) >= 0.35],
        key=lambda r: r.get("score", 0),
        reverse=True
    )[:5]
    print("TOP_RESULTS: ",len(top_results))
    return {
        **state,
        "top_results": top_results
    }


async def build_context(state: RagState) -> RagState:
    top_results = state.get("top_results", [])

    context_parts = []

    for index, result in enumerate(top_results, start=1):
        payload = result.get("payload", {})

        doc_name = payload.get("docName") or "ismeretlen dokumentum"
        path = payload.get("path") or ""
        kind = payload.get("kind") or ""
        name = payload.get("name") or ""
        matched_vector = result.get("matched_vector") or ""

        text = (
            payload.get("text")
            or payload.get("summary")
            or payload.get("code")
            or ""
        )

        if not text.strip():
            continue

        context_parts.append(
            f"[Forrás {index}: {doc_name}]\n"
            f"Path: {path}\n"
            f"Típus: {kind}\n"
            f"Név: {name}\n"
            f"Talált vektor: {matched_vector}\n"
            f"Score: {result.get('score', 0)}\n\n"
            f"{text}"
        )

    context = "\n\n---\n\n".join(context_parts)
    print("Keresési kontextus:",context)
    return {
        **state,
        "context": context
    }


async def generate_answer(state: RagState) -> RagState:
    question = state["question"]
    context = state.get("context", "")

    if not context.strip():
        return {
            **state,
            "answer": "Nem találom a dokumentumokban."
        }

    final_prompt = f"""
    Te egy asszisztens vagy, aki KIZÁRÓLAG az alábbi KONTEKSZTUS alapján válaszol.

    Szabályok:
    - Mindig azon a nyelven válaszolj, amilyen nyelven a kérdés elhangzott.
    - Ha a válasz nem található a kontextusban, ezt mondd: "Nem találom a dokumentumokban."
    - Ne találj ki semmit a kontextuson kívül.
    - Ha kódról kérdeznek, magyarázd el érthetően, mire való és hogyan működik.
    - Ha több forrás van, vond össze az információkat.
    - A választ fogalmazd természetesen, ne csak másold vissza a kontextust.
    - Ugyanazon a nyelven válaszolj, amelyen a felhasználó kérdezett.
    - Ha a kérdés magyar, a válasz is magyar legyen.
    - Ha a kérdés angol, a válasz is angol legyen.
    - A kód nyelve nem határozza meg a válasz nyelvét.
    - Ne fordítsd le a kódrészleteket, csak a magyarázat nyelvét igazítsd a kérdéshez.

    KÉRDÉS TÍPUSA:
    {state.get("question_type", "unknown")}

    KONTEKSZTUS:
    {context}

    KÉRDÉS:
    {question}
    """

    gen_payload = {
        "model": GEN_MODEL,
        "prompt": final_prompt,
        "stream": False
    }

    async with httpx.AsyncClient(timeout=10000) as http_client:
        response = await http_client.post(
            f"{OLLAMA_URL}/api/generate",
            json=gen_payload
        )
        response.raise_for_status()

    data = response.json()
    answer = data.get("response") or " "
    print("A VÁLASZ: ",answer)
    return {
        **state,
        "answer": answer
    }

async def search_knowledge_graph(state:RagState)->RagState:
    TODO
    return{
        **state
    }
    
async def rerank_results(state:RagState)->RagState:
    TODO
    return{
        **state
    }
    
async def generate_followup_query(state:RagState)->RagState:
    TODO
    return{
        **state
    }
    
builder = StateGraph(RagState)

builder.add_node("classify_question", classify_question)
builder.add_node("rephrase_question",rephrase_question)
builder.add_node("embed_question", embed_question)
builder.add_node("search_qdrant", search_qdrant)
builder.add_node("filter_results", filter_results)
builder.add_node("build_context", build_context)
builder.add_node("generate_answer", generate_answer)
builder.add_node("search_knowledge_graph",search_knowledge_graph)
builder.add_node("rerank_results",rerank_results)
builder.add_node("generate_followup_query",generate_followup_query)

builder.set_entry_point("classify_question")

builder.add_edge("classify_question","rephrase_question" )
builder.add_edge("rephrase_question","embed_question")
builder.add_edge("embed_question", "search_qdrant")
builder.add_edge("search_qdrant", "filter_results")
builder.add_edge("filter_results", "build_context")
builder.add_edge("build_context", "generate_answer")
builder.add_edge("generate_answer", END)

rag_graph = builder.compile()
'''
from typing import TypedDict, List
import httpx
import json

from langgraph.graph import StateGraph, END

from app.config import QDRANT_URL, QDRANT_COLLECTION, GEN_MODEL, OLLAMA_URL
from app.services.file_service import FileService


class RagState(TypedDict, total=False):
    question: str
    rephrased_question: str

    question_type: str
    search_vectors: List[str]

    vector: List[float]

    results: List[dict]
    top_results: List[dict]

    context: str
    answer: str


async def classify_question(state: RagState) -> RagState:   
    question = state["question"]

    classifier_prompt = f"""
    Feladat:
    Osztályozd a felhasználói kérdést RAG keresési szempontból.

    Lehetséges kategóriák:

    1. code
    Akkor válaszd, ha a kérdés konkrét kódra, függvényre, osztályra, metódusra,
    hibára, importra, API-ra, routerre, service-re, változóra vagy implementációra kérdez.

    2. summary
    Akkor válaszd, ha a kérdés azt kéri, hogy magyarázd el, mit csinál egy komponens,
    fájl, osztály, metódus vagy folyamat.

    3. text
    Akkor válaszd, ha dokumentációra, README-re, telepítésre, konfigurációra,
    leírásra vagy használati útmutatóra kérdez.

    4. general
    Akkor válaszd, ha nem egyértelmű, vagy többféle keresés is indokolt.

    A válaszod KIZÁRÓLAG érvényes JSON legyen, semmi más.

    Formátum:
    {{
    "question_type": "code | summary | text | general",
    "search_vectors": ["code", "summary", "text"]
    }}

    Szabályok:
    - code kérdésnél: ["code", "summary"]
    - summary kérdésnél: ["summary", "code", "text"]
    - text kérdésnél: ["text", "summary"]
    - general kérdésnél: ["summary", "code", "text"]

    Kérdés:
    {question}
    """

    payload = {
        "model": GEN_MODEL,
        "prompt": classifier_prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=10000) as http_client:
            response = await http_client.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload
            )
            response.raise_for_status()

        data = response.json()
        raw_answer = data.get("response", "").strip()

        parsed = json.loads(raw_answer)

        question_type = parsed.get("question_type", "general")
        search_vectors = parsed.get("search_vectors", ["summary", "code", "text"])

        allowed_types = {"code", "summary", "text", "general"}
        allowed_vectors = {"code", "summary", "text"}

        if question_type not in allowed_types:
            question_type = "general"

        search_vectors = [
            vector for vector in search_vectors
            if vector in allowed_vectors
        ]

        if not search_vectors:
            search_vectors = ["summary", "code", "text"]

        return {
            **state,
            "question_type": question_type,
            "search_vectors": search_vectors
        }

    except Exception as e:
        print("classify_question hiba:", e)
        return {
            **state,
            "question_type": "general",
            "search_vectors": ["summary", "code", "text"]
        }

async def rephrase_question(state: RagState) ->RagState:
    start_question=state["question"]
    
    rewrite_prompt = f"""
    Feladat:
    A felhasználói kérdést alakítsd át egy olyan keresési lekérdezéssé,
    ami a lehető leghatékonyabb vector adatbázis keresést eredményezi
    egy programkódokat és dokumentációt tartalmazó RAG rendszerben.

    Cél:
    - Javítsd a szemantikus keresést
    - Emeld ki a fontos technikai fogalmakat
    - Egészítsd ki releváns szinonimákkal
    - Használj fejlesztői terminológiát
    - Tartsd meg az eredeti jelentést
    - Ne válaszolj a kérdésre
    - Ne magyarázz
    - Csak a keresési lekérdezést add vissza

    Szabályok:
    - Rövid, tömör keresési szöveg legyen
    - Tartalmazhat kulcsszavakat
    - Tartalmazhat technikai fogalmakat
    - Tartalmazhat kapcsolódó komponens neveket
    - Tartalmazhat framework neveket
    - Tartalmazhat programozási fogalmakat
    - Ne használj markdown formázást
    - Ne írj teljes mondatokat, ha nem szükséges
    - A válaszod CSAK a keresési lekérdezés legyen
    - Ne írj bevezetőt
    - Ne írj magyarázatot
    - Ne használj idézőjeleket
    - Ha a kérdésben szerepel osztály, függvény vagy fájlnév,
    azt mindig tartsd meg a keresési lekérdezésben
    
    Kérdés típus viselkedés:
    - code:
    fókuszálj:
    - függvényekre
    - osztályokra
    - implementációra
    - API-kra
    - változónevekre
    - source code fogalmakra

    - summary:
    fókuszálj:
    - architektúrára
    - komponensekre
    - működésre
    - felelősségekre
    - folyamatokra

    - text:
    fókuszálj:
    - dokumentációra
    - konfigurációra
    - telepítésre
    - használatra
    - README jellegű fogalmakra

    - general:
    használj vegyes technikai és dokumentációs kulcsszavakat

    Példák:

    Kérdés:
    "hol van az auth?"

    Keresési lekérdezés:
    authentication auth login jwt token authorization middleware AuthService
    ---
    Kérdés:
    "mit csinál a file upload?"

    Keresési lekérdezés:
    file upload UploadFile multipart form-data file_service upload_qdrant_async FastAPI endpoint
    ---
    Kérdés:
    "hogy működik a router?"

    Keresési lekérdezés:
    FastAPI router APIRouter endpoint route request handler controller API routing
    ---
    Felhasználói kérdés:
    {start_question}
    
    Kérdés típusa:
    {state['question_type']}
    """
    
    payload = {
        "model": GEN_MODEL,
        "prompt": rewrite_prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=10000) as http_client:
            response = await http_client.post(
                f"{OLLAMA_URL}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            data = response.json()

            rewritten_query = data.get("response", "").strip()
            
            return{
                **state,
                "rephrased_question":rewritten_query
            }
    except Exception as e:
        print("rephrase_question hiba:", e)
        return {
            **state,
            "rephrased_question": start_question
        }
    

    
async def embed_question(state: RagState) -> RagState:
    text_for_embedding = (
        state.get("rephrased_question")
        or state.get("question")
        or ""
    )

    print("Embedding keresési szöveg:", text_for_embedding)

    async with httpx.AsyncClient(timeout=10000) as http_client:
        file_service = FileService()
        vector = await file_service.embed(http_client, text_for_embedding)

    return {
        **state,
        "vector": vector
    }


async def search_vector(
    vector_name: str,
    vector: List[float],
    http_client: httpx.AsyncClient
) -> List[dict]:
    search_payload = {
        "vector": {
            "name": vector_name,
            "vector": vector
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
    return data.get("result", [])




async def search_qdrant(state: RagState) -> RagState:
    vector = state["vector"]
    search_vectors = state.get("search_vectors", ["summary", "code", "text"])

    results = []

    async with httpx.AsyncClient(timeout=10000) as http_client:
        for vector_name in search_vectors:
            vector_results = await search_vector(
                vector_name=vector_name,
                vector=vector,
                http_client=http_client
            )

            for result in vector_results:
                result["matched_vector"] = vector_name
                results.append(result)
    print("RESULTS:", len(results))
    return {
        **state,
        "results": results
    }


async def filter_results(state: RagState) -> RagState:
    results = state.get("results", [])

    top_results = sorted(
        [r for r in results if r.get("score", 0) >= 0.35],
        key=lambda r: r.get("score", 0),
        reverse=True
    )[:5]
    print("TOP_RESULTS: ",len(top_results))
    return {
        **state,
        "top_results": top_results
    }


async def build_context(state: RagState) -> RagState:
    top_results = state.get("top_results", [])

    context_parts = []

    for index, result in enumerate(top_results, start=1):
        payload = result.get("payload", {})

        doc_name = payload.get("docName") or "ismeretlen dokumentum"
        path = payload.get("path") or ""
        kind = payload.get("kind") or ""
        name = payload.get("name") or ""
        matched_vector = result.get("matched_vector") or ""

        text = (
            payload.get("content")
            or payload.get("chunk")
            or payload.get("page_content")
            or payload.get("text")
            or payload.get("summary")
            or payload.get("code")
            or payload.get("description")
            or ""
        )

        if not isinstance(text, str):
            text = json.dumps(text, ensure_ascii=False)

        if not text.strip():
            print("Üres payload szöveg. Elérhető payload kulcsok:", list(payload.keys()))
            print(json.dumps(payload, indent=2, ensure_ascii=False))
            continue

        context_parts.append(
            f"[Forrás {index}: {doc_name}]\n"
            f"Path: {path}\n"
            f"Típus: {kind}\n"
            f"Név: {name}\n"
            f"Talált vektor: {matched_vector}\n"
            f"Score: {result.get('score', 0)}\n\n"
            f"{text}"
        )

    context = "\n\n---\n\n".join(context_parts)
    print("Keresési kontextus:", context)
    if not context.strip() and top_results:
        print("Van top_result, de nem sikerült szöveget kinyerni a payloadból.")
    return {
        **state,
        "context": context
    }


async def generate_answer(state: RagState) -> RagState:
    question = state["question"]
    context = state.get("context", "")

    if not context.strip():
        return {
            **state,
            "answer": "Nem találom a dokumentumokban."
        }

    final_prompt = f"""
    Te egy asszisztens vagy, aki KIZÁRÓLAG az alábbi KONTEKSZTUS alapján válaszol.

    Szabályok:
    - Mindig azon a nyelven válaszolj, amilyen nyelven a kérdés elhangzott.
    - Ha a válasz nem található a kontextusban, ezt mondd: "Nem találom a dokumentumokban."
    - Ne találj ki semmit a kontextuson kívül.
    - Ha kódról kérdeznek, magyarázd el érthetően, mire való és hogyan működik.
    - Ha több forrás van, vond össze az információkat.
    - A választ fogalmazd természetesen, ne csak másold vissza a kontextust.
    - Ugyanazon a nyelven válaszolj, amelyen a felhasználó kérdezett.
    - Ha a kérdés magyar, a válasz is magyar legyen.
    - Ha a kérdés angol, a válasz is angol legyen.
    - A kód nyelve nem határozza meg a válasz nyelvét.
    - Ne fordítsd le a kódrészleteket, csak a magyarázat nyelvét igazítsd a kérdéshez.

    KÉRDÉS TÍPUSA:
    {state.get("question_type", "unknown")}

    KONTEKSZTUS:
    {context}

    KÉRDÉS:
    {question}
    """

    gen_payload = {
        "model": GEN_MODEL,
        "prompt": final_prompt,
        "stream": False
    }

    async with httpx.AsyncClient(timeout=10000) as http_client:
        response = await http_client.post(
            f"{OLLAMA_URL}/api/generate",
            json=gen_payload
        )
        response.raise_for_status()

    data = response.json()
    answer = data.get("response") or " "
    print("A VÁLASZ: ",answer)
    return {
        **state,
        "answer": answer
    }

async def search_knowledge_graph(state: RagState) -> RagState:
    # Későbbi Neo4j / knowledge graph keresés helye.
    return {
        **state
    }
    
async def rerank_results(state: RagState) -> RagState:
    # Későbbi LLM-alapú vagy cross-encoder rerank helye.
    return {
        **state
    }
    
async def generate_followup_query(state: RagState) -> RagState:
    # Későbbi follow-up query generálás helye.
    return {
        **state
    }
    
builder = StateGraph(RagState)

builder.add_node("classify_question", classify_question)
builder.add_node("rephrase_question",rephrase_question)
builder.add_node("embed_question", embed_question)
builder.add_node("search_qdrant", search_qdrant)
builder.add_node("filter_results", filter_results)
builder.add_node("build_context", build_context)
builder.add_node("generate_answer", generate_answer)
builder.add_node("search_knowledge_graph",search_knowledge_graph)
builder.add_node("rerank_results",rerank_results)
builder.add_node("generate_followup_query",generate_followup_query)

builder.set_entry_point("classify_question")

builder.add_edge("classify_question","rephrase_question" )
builder.add_edge("rephrase_question","embed_question")
builder.add_edge("embed_question", "search_qdrant")
builder.add_edge("search_qdrant", "filter_results")
builder.add_edge("filter_results", "build_context")
builder.add_edge("build_context", "generate_answer")
builder.add_edge("generate_answer", END)

rag_graph = builder.compile()