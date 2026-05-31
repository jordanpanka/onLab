from datasets import Dataset
from ragas import evaluate
from ragas.metrics import context_precision

dataset = Dataset.from_dict({
    "question": ["Mi a Qdrant?"],
    "answer": ["A Qdrant egy vektorbázis, amely embeddingek tárolására és keresésére használható."],
    "contexts": [[
        "A Qdrant vektorbázis, amely embeddingek tárolására és hasonlósági keresésre szolgál."
    ]],
    "ground_truth": [
        "A Qdrant embeddingek tárolására és vektoros keresésre szolgál."
    ]
})

result = evaluate(
    dataset,
    metrics=[context_precision]
)

print(result)