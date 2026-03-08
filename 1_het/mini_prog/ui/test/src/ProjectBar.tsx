import { Box, Collapse, IconButton, InputAdornment, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState } from "preact/hooks"
import { AddCircle, ExpandLess, ExpandMore } from "@mui/icons-material";
import { buildTree, FolderTree, type FileItem } from "./FolderTree";
import { NewProject } from "./NewProject";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import FolderTwoToneIcon from "@mui/icons-material/FolderTwoTone";
import FolderOpenTwoToneIcon from "@mui/icons-material/FolderOpenTwoTone";
export type Project = {
    id: number,
    invid: number,
    name: string,
    description: string
}
export type Investigation = {
    id: number,
    name: string,
    description: string
}

const openwidth = 240;
const closedWidth = 60;
const HEADER_H = 64
export function ProjectBar() {
    const [newProject, setNewProject] = useState<Project>();
    const [filesByProjId, setFilesByProjId] = useState<Record<number, FileItem[]>>({});
    const [projectsByInvId, setProjectsByInvId] = useState<Record<number, Project[]>>({});
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [selectedInvId, setSelectedInvId] = useState<number>(-1);
    const [invOpen, setInvOpen] = useState<Record<number, boolean>>({});
    const [projOpen, setProjOpen] = useState<Record<number, boolean>>({});
    const [open, setOpen] = useState(true);
    const [showInvWindow, setShowInvwindow] = useState(false);
    const [showProjWindow, setShowProjwindow] = useState(false);

    async function addProject() {
        setShowProjwindow(true);
    }
    async function addInvestigation() {
        setShowInvwindow(true);
    }
    useEffect(() => { loadInvestigations(); }, []);
    async function loadInvestigations() {
        const token = localStorage.getItem("token");
        const response = await fetch("api/investigations/load", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });
        const data = await response.json();
        setInvestigations(data);
    }
    //return the projects of the investigation
    async function loadProjects(id: number) {
        const token=localStorage.getItem("token");
        const response = await fetch("api/investigations/projects/load", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ id })
        });
        const data = await response.json();
        setProjectsByInvId(prev => ({
        ...prev,
        [id]: data
    }));
    }
    //return the files of a project
    /*async function loadFiles(id: number) {
        const response = await fetch("api/investigations/projects/files/load", {
            method: "Get",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        })
        const data = await response.json();
        setFilesByProjId(data);
    }*/
    return (<>
        <Drawer variant="persistent" anchor="left" open={open} sx={{
            width: open ? openwidth : closedWidth, gap: 2, "& .MuiDrawer-paper": {
                width: open ? openwidth : closedWidth,
                boxSizing: "border-box",
                top: HEADER_H,
                height: `calc(100% - ${HEADER_H}px)`,
            },
        }}>
            <Box sx={{
                display: "flex", justifyContent: "space-between", height: 56, alignItems: "center",
                marginLeft: 2, marginRight: 2
            }}>
                <Typography sx={{
                    lineHeight: 1,
                    fontFamily: "'Inter', sans-serif",
                }}>My Ivestigations</Typography>
                <IconButton onClick={addInvestigation}><AddCircle></AddCircle></IconButton>
            </Box>

            <Box sx={{ display: "flex", marginLeft: 2, marginRight: 2 }}>
                <TextField size="small" placeholder="Search..." InputProps={{
                    endAdornment: (<InputAdornment position="end"> <IconButton>
                        <SearchIcon />
                    </IconButton> </InputAdornment>),
                }}></TextField>

            </Box>

            <List>
                {investigations.map(inv => {
                    const isInvOpen = !!invOpen[inv.id];
                    console.log(inv);
                    return (
                        <div key={inv.id}>
                            <ListItemButton onClick={async () => {
                                await loadProjects(inv.id);
                                setInvOpen(s => ({ ...s, [inv.id]: !s[inv.id] }));
                                setSelectedInvId(inv.id);
                            }}>
                                {/*isInvOpen ? <ExpandMore /> : <ExpandLess />*/}
                                {isInvOpen ? "🧑‍💻": "💻"}
                               
                                <ListItemText primary={inv.name}></ListItemText>
                                <IconButton onClick={addProject}>
                                    <CreateNewFolderIcon />
                                </IconButton>
                            </ListItemButton>


                            <Collapse in={isInvOpen} timeout="auto" unmountOnExit>
                                <List disablePadding dense>
                                    {(projectsByInvId[inv.id] ?? []).map(project => {
                                        const isProjOpen = !!projOpen[project.id];
                                        const files = filesByProjId[project.id] ?? [];
                                        const tree = buildTree(files);

                                        return (
                                            <div key={project.id}>
                                                <ListItemButton sx={{ pl: 4 }} onClick={async () => {
                                                    //await loadConversation(project.id);
                                                    setProjOpen(s => ({ ...s, [project.id]: !s[project.id] }));
                                                }}>
                                                    {isProjOpen ? "📂" : "📁"}
                                                    <ListItemText primary={project.name}></ListItemText>
                                                    {/*isProjOpen ? <ExpandMore /> : <ExpandLess />*/}

                                                </ListItemButton>
                                                <Collapse in={isProjOpen} timeout="auto" unmountOnExit>
                                                    <List disablePadding dense>
                                                        
                                                    </List>
                                                </Collapse>
                                            </div>

                                        )

                                    })}
                                </List>
                            </Collapse>
                        </div>
                    )
                })}
            </List>
        </Drawer >
        {showInvWindow && <div className="modal-overlay">
            <div className="modal-window">
                <NewProject isInv={true} open={showInvWindow} setOpen={setShowInvwindow} loadInvestigations={loadInvestigations}></NewProject>
            </div>
        </div>}
        {showProjWindow && <div className="modal-overlay">
            <div className="modal-window">
                <NewProject isInv={false} invId={selectedInvId} open={showProjWindow} setOpen={setShowInvwindow} loadInvestigations={loadInvestigations}></NewProject>
            </div>
        </div >}
    </>)

}