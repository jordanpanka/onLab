import { Box, IconButton, InputAdornment, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import SearchIcon from "@mui/icons-material/Search";

import { useEffect, useState } from "preact/hooks"
type Project = {
    id: number,
    name: string,
    description: string
}
export function ProjectBar() {
    const [search, setSearch] = useState("");
    const [newProject, setNewProject] = useState<Project>();
    const [full, setFull] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [open, setOpen] = useState(true);
    async function onClick() {
        const response = await fetch("api/projects", {
            method: "POST",
            body: localStorage.getItem("token")
        });

    }
    async function addProject() {
        const response = await fetch("api/projects/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newProject })
        });
    }
    useEffect(() => { loadProjects(); }, []);
    async function loadProjects() {
        const response = await fetch("api/projects/load");
        const data = await response.json();
        setProjects(data);

    }
    return (<>
        <Drawer variant="persistent" anchor="left" open={open}>
            <Typography sx={{
                "& .MuiInputBase-input": {
                    fontFamily: "'Inter', sans-serif",
                },
                "& .MuiInputLabel-root": {
                    fontFamily: "'Playfair Display', serif",
                },
            }}>My projects</Typography>
            <Box sx={{ display: "flex" }}>
                <TextField size="small" placeholder="Search..." InputProps={{
                    endAdornment: (<InputAdornment position="end"> <IconButton>
                        <SearchIcon />
                    </IconButton> </InputAdornment>),
                }}></TextField>

            </Box>

            <List>
                {projects.map((project) => {
                    <ListItemButton key={project.id}>
                        <ListItemText>
                            {project.name}
                        </ListItemText>
                    </ListItemButton>
                })}
            </List>
        </Drawer >

    </>)

}