import asyncio
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)

from app.services.rag_graph import rag_graph


TEST_QUESTIONS = [
    {
        "question": "Mire szolgál a Qdrant a rendszerben?",
        "ground_truth": "A Qdrant az embeddingek tárolására és vektoros hasonlósági keresésre szolgál."
    },
    {
        "question": "Mi történik fájlfeltöltéskor?",
        "ground_truth": "A fájl feldolgozásra kerül, chunkokra bontódik, embedding készül belőle, majd az adatok Qdrantba, MinIO-ba és Neo4j-be kerülnek."
    },
    {
        "question": "Mire használható a Neo4j a projektben?",
        "ground_truth": "A Neo4j gráf alapú kapcsolatok, például fájlok, osztályok, metódusok és függvények közötti összefüggések tárolására használható."
    }
]


def initial_state(question: str, ground_truth: str):
    return {
        "user_id": 1,
        "investigation_id": 1,
        "project_id": 1,

        "question": question,
        "rephrased_question": "",
        "ground_truth": ground_truth,

        "question_type": "",
        "search_vectors": [],

        "vector": [],

        "results": [],
        "top_results": [],
        "graph_context": [],
        "retrieved_contexts": [],

        "context": "",
        "answer": "",

        "use_graph": False,
        "needs_rerank": False,

        "retrieved_count": 0,
        "retrieval_time_ms": 0,
        "generation_time_ms": 0,
        "total_time_ms": 0,

        "ragas_run_id": "langgraph_v1"
    }


async def main():
    rows = []

    for item in TEST_QUESTIONS:
        result = await rag_graph.ainvoke(
            initial_state(item["question"], item["ground_truth"])
        )

        rows.append({
            "question": result["question"],
            "answer": result["answer"],
            "contexts": result["retrieved_contexts"],
            "ground_truth": result["ground_truth"],
        })

    dataset = Dataset.from_list(rows)

    result = evaluate(
        dataset,
        metrics=[
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        ],
    )

    print(result)

    df = result.to_pandas()
    df.to_csv("ragas_results.csv", index=False)
    print("Mentve: ragas_results.csv")


if __name__ == "__main__":
    asyncio.run(main())