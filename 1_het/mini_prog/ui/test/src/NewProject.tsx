import { useState } from "preact/hooks";
import type { Project } from "./ProjectBar";

export function NewProject({project,setProject}:{project: Project, setProject:(p:Project)=>void}){
    const [name,setName]=useState("");
    const [description,setDescription]=useState("");
    async function addInvestigation(){
        const token=localStorage.getItem("token");
        const response=await fetch("api/investigations/add", {
            method: "POST",
            headers:{"Content-Type": "application/json",
                    "Authorization": "Bearer " + token

            },
            body: JSON.stringify({name,description})
        })
    }
    return<div>
        <input value={project.name} onInput={e=>setName(e.currentTarget.value)}></input>
        <input value={project.description} onInput={e=>setDescription(e.currentTarget.value)}></input>
        <button>Back</button>
        <button>Create</button>  
    </div>
}