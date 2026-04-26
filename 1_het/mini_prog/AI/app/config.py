import os
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION")

OLLAMA_URL = os.getenv("OLLAMA_URL")
GEN_MODEL = os.getenv("GEN_MODEL")
EMBED_MODEL = os.getenv("EMBED_MODEL")