from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Python Service")

class TextRequest(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "Python service is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chunk")
def chunk_text(request: TextRequest):
    words = request.text.split()
    return {
        "chunks": [" ".join(words[i:i+5]) for i in range(0, len(words), 5)]
    }