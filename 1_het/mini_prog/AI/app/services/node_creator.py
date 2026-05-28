import os
from fastapi import UploadFile
from tree_sitter import Parser as TSParser
from tree_sitter_languages import get_language
from llama_index.core.schema import TextNode
from app.services.ollama_call import call_llm

class NodeCreator:   
    def get_python_class_name(self,ts_node, source_code: bytes) -> str | None:
            for child in ts_node.children:
                if child.type == "identifier":
                    return source_code[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
            return None
        
    def ts_node_to_llamaindex_node_class(self,ts_node,source_code: bytes,  path:str):
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
    def ts_node_to_llamaindex_node_function(self, ts_node, source_code:bytes,  path:str):
        code = source_code[ts_node.start_byte:ts_node.end_byte].decode("utf-8", errors="replace")
         
        return TextNode(
        text=code,
        metadata={
            "path": path,
            "kind": "function",
            "start_line": ts_node.start_point[0] + 1,
            "start_col": ts_node.start_point[1],
            "end_line": ts_node.end_point[0] + 1,
            "end_col": ts_node.end_point[1],
            "ts_type": ts_node.type,
        })
    async def generate_summary_to_node(self,node)->str:
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
            perc=await self.check_summary(code,summary.strip())
            print(" A százalékos mgfeleltság" +perc)
            return summary.strip()
        
    async def check_summary(self, code, summary)->float:
        prompt=f"""
        Feladat:
        Ellenőrizd le, hogy az adott kódhoz tartozó összefoglaló megfelel- e annak amit az adott kód tartalmaz. 
        
        Mateadatok:
        -Kód:{code}
        -Összefoglaló:{summary}
        
        A válasz egy szám legyen,  az alapján hogy hány százalékban felel meg az összefoglaló a kódnak.
        """
        perc=await call_llm(prompt)
        return perc.strip()
        
        
    