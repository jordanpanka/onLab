import { useState } from "preact/hooks";
import type { Project } from "./ProjectBar";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";

export function NewProject({open, setOpen, loadInvestigations}:{open:boolean, setOpen:(b:boolean)=>void, loadInvestigations:()=>void}){
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

        setOpen(false);
    }
    return(<>
        <Dialog open={open} onClose={()=>setOpen(false)}>
            <DialogTitle>New Investigation</DialogTitle>
            <DialogContent>
                <TextField value={name} placeholder="Name"></TextField>
                <TextField value={description} placeholder="Description"></TextField>
            </DialogContent>
            <DialogActions>
                <Button onClick={()=>setOpen(false)}>Cancel</Button>
                <Button onClick={addInvestigation}>Create</Button>
            </DialogActions>
        </Dialog>
    </>);
}/*
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from "@mui/material";

export function NewProject() {

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = async () => {

    await fetch("api/projects/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    setOpen(false);
    setName("");
  };

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Add Project
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>

        <DialogTitle>Add new project</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project name"
            fullWidth
            value={name}
            onChange={e => setName(e.currentTarget.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Add</Button>
        </DialogActions>

      </Dialog>
    </>
  );
}*/