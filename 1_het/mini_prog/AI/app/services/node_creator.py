import os
from fastapi import UploadFile
from tree_sitter import Parser as TSParser
from tree_sitter_languages import get_language
from llama_index.core.schema import TextNode
from app.services.ollama_call import call_llm
from app.services.parse_service import CodeParser

class NodeCreator:   

    def split_code_semantically_o(self,code: str,max_chars: int = 5000,overlap: int = 300) -> list[str]:
        if len(code) <= max_chars:
            return [code]

        # 1. Próbáljunk üres sorok mentén bontani
        blocks = code.split("\n\n")

        chunks = []
        current = ""

        for block in blocks:
            candidate = current + "\n\n" + block if current else block

            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    chunks.append(current)

                if len(block) <= max_chars:
                    current = block
                else:
                    # 2. Ha egy blokk is túl hosszú, sorok alapján bontjuk
                    line_chunks = self.split_code_by_lines(block, max_chars, overlap)
                    chunks.extend(line_chunks)
                    current = ""

        if current:
            chunks.append(current)

        return chunks 
    def split_code_by_lines_o(self, code: str,max_chars: int = 5000,overlap: int = 300) -> list[str]:
        lines = code.splitlines(keepends=True)

        chunks = []
        current = ""

        for line in lines:
            if len(current) + len(line) <= max_chars:
                current += line
            else:
                if current:
                    chunks.append(current)

                # overlap az előző chunk végéből
                overlap_text = current[-overlap:] if current else ""
                current = overlap_text + line

        if current:
            chunks.append(current)

        return chunks 
    def split_code_semantically(self, code: str, max_chars: int = 2000, overlap: int = 200) -> list[str]:
        if len(code) <= max_chars:
            return [code]

        blocks = code.split("\n\n")
        chunks = []
        current = ""

        for block in blocks:
            candidate = current + "\n\n" + block if current else block

            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    chunks.append(current)

                if len(block) <= max_chars:
                    current = block
                else:
                    chunks.extend(self.split_code_by_lines(block, max_chars, overlap))
                    current = ""

        if current:
            chunks.append(current)

        return chunks


    def split_code_by_lines(self, code: str, max_chars: int = 2000, overlap: int = 200) -> list[str]:
        lines = code.splitlines(keepends=True)
        chunks = []
        current = ""

        for line in lines:
            # ha egyetlen sor is túl hosszú, karakter alapján tovább daraboljuk
            if len(line) > max_chars:
                if current:
                    chunks.append(current)
                    current = ""

                for i in range(0, len(line), max_chars - overlap):
                    chunks.append(line[i:i + max_chars])
                continue

            if len(current) + len(line) <= max_chars:
                current += line
            else:
                if current:
                    chunks.append(current)

                overlap_text = current[-overlap:] if current else ""
                current = overlap_text + line

        if current:
            chunks.append(current)

        return chunks
    
    
    def ts_node_to_llamaindex_node_class_o(self,ts_node,source_code: bytes,  path:str):
            code = source_code[ts_node.start_byte:ts_node.end_byte].decode("utf-8", errors="replace")
            parse_service = CodeParser()
            class_name = parse_service.get_node_name(ts_node, source_code)
            
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
    def ts_node_to_llamaindex_node_class(
    self,
    ts_node,
    source_code: bytes,
    path: str
) -> list[TextNode]:

        code = source_code[ts_node.start_byte:ts_node.end_byte].decode(
            "utf-8",
            errors="replace"
        )

        parse_service = CodeParser()
        class_name = parse_service.get_node_name(ts_node, source_code)

        chunks = self.split_code_semantically(code)

        nodes = []

        for index, chunk in enumerate(chunks, start=1):
            nodes.append(
                TextNode(
                    text=chunk,
                    metadata={
                        "path": path,
                        "kind": "class",
                        "name": class_name,
                        "chunk_index": index,
                        "chunk_count": len(chunks),
                        "is_chunked": len(chunks) > 1,
                        "start_line": ts_node.start_point[0] + 1,
                        "start_col": ts_node.start_point[1],
                        "end_line": ts_node.end_point[0] + 1,
                        "end_col": ts_node.end_point[1],
                        "ts_type": ts_node.type,
                    }
                )
            )

        return nodes
    def ts_node_to_llamaindex_node_function_o(self, ts_node, source_code:bytes,  path:str):
        code = source_code[ts_node.start_byte:ts_node.end_byte].decode("utf-8", errors="replace")
        parse_service=CodeParser()
        return TextNode(
        text=code,
        metadata={
            "path": path,
            "kind": "function",
            "name": parse_service.get_node_name(ts_node, source_code),
            "start_line": ts_node.start_point[0] + 1,
            "start_col": ts_node.start_point[1],
            "end_line": ts_node.end_point[0] + 1,
            "end_col": ts_node.end_point[1],
            "ts_type": ts_node.type,
        })
    def ts_node_to_llamaindex_node_function(
    self,
    ts_node,
    source_code: bytes,
    path: str
) -> list[TextNode]:

        code = source_code[ts_node.start_byte:ts_node.end_byte].decode(
            "utf-8",
            errors="replace"
        )

        parse_service = CodeParser()
        function_name = parse_service.get_node_name(ts_node, source_code)

        chunks = self.split_code_semantically(code)

        nodes = []

        for index, chunk in enumerate(chunks, start=1):
            nodes.append(
                TextNode(
                    text=chunk,
                    metadata={
                        "path": path,
                        "kind": "function",
                        "name": function_name,
                        "chunk_index": index,
                        "chunk_count": len(chunks),
                        "is_chunked": len(chunks) > 1,
                        "start_line": ts_node.start_point[0] + 1,
                        "start_col": ts_node.start_point[1],
                        "end_line": ts_node.end_point[0] + 1,
                        "end_col": ts_node.end_point[1],
                        "ts_type": ts_node.type,
                    }
                )
            )

        return nodes
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
        
        
    