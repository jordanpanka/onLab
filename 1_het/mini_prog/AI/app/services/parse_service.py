import os
from fastapi import UploadFile
from tree_sitter import Parser as TSParser
from tree_sitter_languages import get_language
from llama_index.core.schema import TextNode
from app.services.ollama_call import call_llm

class CodeParser:
    
    def __init__(self):
        self.selected_language = None
    
    '''code_parsers = {
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
    }'''
    code_parsers = {
    ".py": {
        "language": get_language("python"),
        "name": "python",
        "node_types": {
            "class": ["class_definition"],
            "function": ["function_definition"],
            "call": ["call"],
            "import": ["import_statement", "import_from_statement"]
        }
    },

    ".cs": {
        "language": get_language("c_sharp"),
        "name": "c_sharp",
        "node_types": {
            "class": ["class_declaration"],
            "function": ["method_declaration"],
            "call": ["invocation_expression"],
            "import": ["using_directive"]
        }
    },

    ".js": {
        "language": get_language("javascript"),
        "name": "javascript",
        "node_types": {
            "class": ["class_declaration"],
            "function": ["function_declaration", "method_definition"],
            "call": ["call_expression"],
            "import": ["import_statement"]
        }
    },

    ".ts": {
        "language": get_language("typescript"),
        "name": "typescript",
        "node_types": {
            "class": ["class_declaration"],
            "function": ["function_declaration", "method_definition"],
            "call": ["call_expression"],
            "import": ["import_statement"]
        }
    },

    ".tsx": {
        "language": get_language("tsx"),
        "name": "typescript",
        "node_types": {
            "class": ["class_declaration"],
            "function": ["function_declaration", "method_definition"],
            "call": ["call_expression"],
            "import": ["import_statement"]
        }
    }
}
    def select_language(self, file_path:str)->str:
        ext = os.path.splitext(file_path)[1]
        self.selected_language=ext
        return self.code_parsers[ext]["language"]
    
    async def parse_code_to_tree(self,file:UploadFile, path:str):
        
        source_code=await file.read()
        parser=TSParser()
        config=self.select_language(path)
        if config is None:
            raise ValueError(f"Unsupported file type: {path}")
        parser.set_language(config)
        tree=parser.parse(source_code)
        return tree, source_code
    
    def extract_class_function_nodes(self,node):
        classes=[]
        functions=[]
        #JAVITAS: minden függvényt 2x tárol el vagy csak egyszer és a külsö függvényeket külön
        node_types=self.code_parsers[self.selected_language]["node_types"]
        if(node.type in node_types["class"]):
            classes.append(node)
        
        elif(node.type in node_types["function"]):
            functions.append(node)
        for child in node.children:
            child_classes, child_functions = self.extract_class_nodes(child)

            classes.extend(child_classes)
            functions.extend(child_functions)

        return classes, functions
    
    def get_node_name(self, ts_node, source_code: bytes) -> str | None:
        for child in ts_node.children:
            if child.type in ["identifier", "property_identifier"]:
                return source_code[child.start_byte:child.end_byte].decode(
                    "utf-8",
                    errors="replace"
                )
        return None
        
    def print_tree(self, node, indent=0):
        print("  " * indent + f"{node.type} [{node.start_point} - {node.end_point}]")
        
        for child in node.children:
            self.print_tree(child, indent + 1)
            
    def extract_imports(self, node, source_code: bytes) -> list[str]:
        imports = []

        node_types = self.code_parsers[self.selected_language]["node_types"]

        if node.type in node_types["import"]:
            import_text = source_code[node.start_byte:node.end_byte].decode(
                "utf-8",
                errors="replace"
            )
            imports.append(import_text)

        for child in node.children:
            imports.extend(self.extract_imports(child, source_code))

        return imports
    
    def extract_calls_from_function(self, function_node, source_code: bytes) -> list[str]:
        calls = []

        node_types = self.code_parsers[self.selected_language]["node_types"]

        def walk(node):
            if node.type in node_types["call"]:
                function_child = node.child_by_field_name("function")

                if function_child is None and len(node.children) > 0:
                    function_child = node.children[0]

                if function_child is not None:
                    call_name = source_code[
                        function_child.start_byte:function_child.end_byte
                    ].decode("utf-8", errors="replace")

                    calls.append(call_name)

            for child in node.children:
                walk(child)

        walk(function_node)
        return calls
    def extract_methods_in_classes(self, class_nodes, source_code: bytes) -> list[dict]:
        relations = []

        for class_node in class_nodes:
            class_name = self.get_node_name(class_node, source_code)

            for child in class_node.children:
                child_classes, child_functions = self.extract_class_nodes(child)

                for fn in child_functions:
                    method_name = self.get_node_name(fn, source_code)

                    if class_name and method_name:
                        relations.append({
                            "class": class_name,
                            "method": method_name,
                            "start_line": fn.start_point[0] + 1,
                            "end_line": fn.end_point[0] + 1
                        })

        return relations
    
    def extract_graph_relations(self, tree, source_code: bytes) -> dict:
        imports = self.extract_imports(tree.root_node, source_code)

        _, functions = self.extract_class_nodes(tree.root_node)

        classes, functions = self.extract_class_nodes(tree.root_node)

        methods = self.extract_methods_in_classes(classes, source_code)
        calls = []

        for fn in functions:
            caller_name = self.get_node_name(fn, source_code)

            if caller_name is None:
                continue

            called_functions = self.extract_calls_from_function(fn, source_code)

            for called_name in called_functions:
                calls.append({
                    "caller": caller_name,
                    "called": called_name,
                    "caller_start_line": fn.start_point[0] + 1,
                    "caller_end_line": fn.end_point[0] + 1
                })
            

        return {
                "imports": imports,
                "calls": calls,
                "methods": methods
            }
    '''      
    def get_python_class_name(ts_node, source_code: bytes) -> str | None:
        for child in ts_node.children:
            if child.type == "identifier":
                return source_code[child.start_byte:child.end_byte].decode("utf-8", errors="replace")
        return None
    '''        