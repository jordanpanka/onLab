import { useState } from "preact/hooks";

export function NewProject(){
    const [name,setName]=useState("");
    const [descripton,setDescripton]=useState("");
    return<div>
        <input value={name}></input>
        <input value={descripton}></input>
        <button>Back</button>
        <button>Create</button>
        
    </div>
}