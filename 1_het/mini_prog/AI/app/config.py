import os
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION")

OLLAMA_URL = os.getenv("OLLAMA_URL")
OLLAMA_BASE_URL=os.getenv("OLLAMA_BASE_URL")
EMBED_MODEL_CLOUD=os.getenv("OLLAMA_EMBED_MODEL")
GEN_MODEL = os.getenv("GEN_MODEL")
EMBED_MODEL = os.getenv("EMBED_MODEL")
GEN_MODEL_CLOUD=os.getenv("GEN_MODEL_CLOUD")
OLLAMA_API_KEY=os.getenv("OLLAMA_API_KEY")
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"