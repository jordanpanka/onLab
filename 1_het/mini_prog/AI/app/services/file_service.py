import io
from pypdf import PdfReader
from fastapi import UploadFile
import httpx
import os
import uuid
import httpx

from fastapi import UploadFile

from app.config import QDRANT_URL, QDRANT_COLLECTION, EMBED_MODEL, OLLAMA_URL
from app.models.models import Ids, ServiceResult
from app.services.parse_service import CodeParser
from app.services.node_creator import NodeCreator
from llama_index.core.schema import TextNode

from typing import List
from fastapi import UploadFile, Form, File

class FileService:
    ignore_directories_files=[ "node_modules", "bin", "obj", "dist", "build" , ".git ",".venv" ,"__pycache__", 	".exe", ".dll ",".so ",".obj",".class" ]
    code_sources=[".cs", ".py" , ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".php", ".cpp", ".c"]
    structured_data=[".json ",".yaml", ".yml" , ".xml", ".toml", ".ini"]
    documentation=[".md", ".txt", ".rst", ".pdf"]
    async def extract_text_from_pdf(self,file: UploadFile) -> str:
        # file beolvasása memóriába
        content = file.file.read()

        reader = PdfReader(io.BytesIO(content))

        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        return "\n".join(text_parts)

    def chunk_text(self,text: str, chunk_length: int, redundance: int) -> list[str]:
        chunks=[]
        i=0
        while i<len(text):
            length=min(chunk_length, len(text)-1)
            chunk=text[i:i+length]
            chunks.append(chunk)
            
            i+=chunk_length-redundance
            if(chunk_length-redundance <=0):
                break
        
        return chunks

    async def embed(self,http: httpx.AsyncClient, text: str) -> list[float]:
        payload = {
            "model": EMBED_MODEL,
            "prompt": text
        }

        response = await http.post(
            f"{OLLAMA_URL}/api/embeddings",
            json=payload
        )
        response.raise_for_status()

        data = response.json()
        return [float(x) for x in data["embedding"]]

    async def upload_qdrant_async(self,user_id: int ,
        inv_id: int,
        project_id: int,
        paths: List[str] ,
        files: List[UploadFile] ) -> ServiceResult:
        async with httpx.AsyncClient(timeout=5000) as http_client:
            points=[]
            for i in range(len(files)):
                text = ""
                
                if files[i] is None:
                    return ServiceResult.fail("File is empty")

                content = await files[i].read()
                if len(content) == 0:
                    return ServiceResult.fail("File is empty")

                await files[i].seek(0)

                doc_name = os.path.basename(files[i].filename or "")
                ext = os.path.splitext(doc_name)[1].lower()
                #depends on the filetype, what should i do
                type=self.select_file_type(paths[i])
                
                match type:
                    case "ignore":
                        continue
                    case "code":
                        nodes=await self.process_code_file(files[i], paths[i])
                        for node in nodes:
                            #embed code and summary text
                            code=await self.embed(http_client,node.text)
                            summary=await self.embed(http_client,node.metadata["summary"])
                            points.append({
                                "id":str(uuid.uuid4()),
                                "vector":{
                                    "code":code,
                                    "summary":summary
                                },
                                "payload":{
                                    "userId":user_id,
                                    "investigationId": inv_id,
                                    "projectId": project_id,
                                    "docName": files[i].filename
                                }
                                    
                            })
                            
                    case "structured":
                        continue
                    case "documentation":
                        nodes=await self.process_doc_file(files[i],paths[i])
                        for node in nodes:
                            text_vec=self.embed(http_client,node.text)
                            points.append({
                                "id":str(uuid.uuid4()),
                                "vector":{
                                    "text":text_vec
                                },
                                "payload":{
                                    "userId":user_id,
                                    "investigationId": inv_id,
                                    "projectId": project_id,
                                    "docName": files[i].filename
                                }
                            })
                    
                
               
            # Text -> chunks
            # chunk = chunk_text(text, 800, 170)
            if not points:
                return ServiceResult.fail("No points to upload")    
                
            upsert_payload = {
                "points": points
            }

            upsert_res = await http_client.put(
                    f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}/points?wait=true",
                    json=upsert_payload
            )
            upsert_res.raise_for_status()

            return ServiceResult.success()
        
        #file should be uploaded in qdrant or not
        #def should_ignore_file(self, path:str)->bool:
        #    if(word in path for word in self.ignore_directories_files):
        #        return True
        #   return False
        
    #select which type of document should we process
    def select_file_type(self, file_path: str) -> str:
        file_path = file_path.lower()

        if any(word.strip() in file_path for word in self.ignore_directories_files):
            return "ignore"
        elif any(file_path.endswith(ext.strip()) for ext in self.code_sources):
            return "code"
        elif any(file_path.endswith(ext.strip()) for ext in self.structured_data):
            return "structured"
        elif any(file_path.endswith(ext.strip()) for ext in self.documentation):
            return "documentation"
        else:
            return "unknown"
            
    #process code files
    async def process_code_file(self,file: UploadFile, path:str)->List[TextNode]:
            c_parser=CodeParser()
            tree, source_code=await c_parser.parse_code_to_tree(file,path)
            classnodes=c_parser.extract_class_nodes(tree.root_node)
                    
            nodecreator=NodeCreator()
            llamaindexnodes=[]
            for node in classnodes:
                llamaindexnodes.append(nodecreator.ts_node_to_llamaindex_node(node,source_code,path))
                    
            for node in llamaindexnodes:
                summary= await nodecreator.generate_summary_to_node(node)
                print("Az összefoglaló")
                print(summary)
                node.metadata["summary"] = summary
            return llamaindexnodes
        
        
    async def process_doc_file(self,file: UploadFile, path:str)->List[TextNode]:
            text=self.extract_text_from_pdf(file)
            chunks=self.chunk_text(text, 800, 120)
            tsnodes=[]
            for chunk in chunks:
                node=TextNode(
                    text=chunk,
                    metadata={
                        "path":path
                        
                    }
                )
                tsnodes.append(node)
            return tsnodes