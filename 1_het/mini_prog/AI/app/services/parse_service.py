import os
from fastapi import UploadFile
from tree_sitter import Parser as TSParser
from tree_sitter_languages import get_language
from llama_index.core.schema import TextNode
from app.services.ollama_call import call_llm

class CodeParser:
    
    code_parsers = {
        ".c": get_language("c"),
        ".cs": get_language("c_sharp"),
        ".py": get_language("python"),
        ".js": get_language("javascript"),
        ".ts": get_language("typescript"),
        ".tsx": get_language("tsx"),
        ".jsx": get_language("javascript"),
        ".java": get_language("java"),
        ".go": get_language("go"),
        ".rs": get_language("rust"),
        ".php": get_language("php"),
        ".cpp": get_language("cpp"),
    }
    def select_language(self, file_path:str)->str:
        ext = os.path.splitext(file_path)[1]
        return self.code_parsers.get(ext)
    
    async def parse_code_to_tree(self,file:UploadFile, path:str):
        
        source_code=await file.read()
        parser=TSParser()
        parser.set_language(self.select_language(path))
        tree=parser.parse(source_code)
        return tree, source_code
    
    def extract_class_nodes(self,node):
        classes=[]
        
        if(node.type=="class_definition"):
            classes.append(node)
            
        for child in node.children:
            classes.extend(self.extract_class_nodes(child))
        
        return classes
    
    def get_python_class_name(ts_node, source_code: bytes) -> str | None:
        for child in ts_node.children:
            if child.type == "identifier":
                return source_code[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
        return None
    
    def ts_node_to_llamaindex_node(self,ts_node,source_code: bytes, file_path: str, language: str, path:str):
        code = source_code[ts_node.start_byte:ts_node.end_byte].decode("utf-8", errors="replace")
        class_name = self.get_python_class_name(ts_node, source_code)
        
        return TextNode(
        text=code,
        metadata={
            "path": path,
            "kind": "class",
            "name": class_name,
            "start_line": ts_node.start_point[0] + 1,
            "start_col": ts_node.start_point[1],
            "end_line": ts_node.end_point[0] + 1,
            "end_col": ts_node.end_point[1],
            "ts_type": ts_node.type,
        }
    )
    
    async def generate_summary_to_node(node)->str:
        code = node.text
        path = node.metadata.get("path", "")
        kind = node.metadata.get("kind", "")
        name = node.metadata.get("name", "")

        prompt = f"""
        Feladat:
        Készíts rövid, informatív összefoglalót az alábbi Python kódrészletről.

        Szabályok:
        - 3-5 mondat
        - Írd le, mi a kódrészlet fő felelőssége
        - Emeld ki a fontos metódusokat vagy működést
        - Ne másold vissza a teljes kódot
        - Technikai, de tömör legyen

        Metaadatok:
        - Path: {path}
        - Típus: {kind}
        - Név: {name}

        Kód:
        {code}
        """
        summary = await call_llm(prompt)
        return summary.strip()
                