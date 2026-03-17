import { Box, Collapse, IconButton, InputAdornment, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DiamondIcon from "@mui/icons-material/Diamond";
import DiamondOutlinedIcon from "@mui/icons-material/DiamondOutlined";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState, type Dispatch, type StateUpdater } from "preact/hooks"
import { buildTree, FolderTree, type FileItem } from "./FolderTree";
import { NewProject } from "./NewProject";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { RowMenu } from "./RowMenu";
import type { Conversation } from "./Chat";
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
type pbProps = {
    setSelectedProject: Dispatch<StateUpdater<Project | undefined>>,
    shoWindowFile: boolean,
    setShowWindowFile: (b: boolean) => void,
    conversatuionsByProjId:Record<number, Conversation[]>,
    loadConversations:(s:number)=>void,
    newConv:boolean,
    setNewConv:(b:boolean)=>void,
    selectedConversationId:number,
    setSelectedConversationId:(n:number)=>void

}
const openwidth = 240;
const closedWidth = 60;
const HEADER_H = 64;
export function ProjectBar(prop: pbProps
) {
    const [filesByProjId, setFilesByProjId] = useState<Record<number, FileItem[]>>({});
    const [projectsByInvId, setProjectsByInvId] = useState<Record<number, Project[]>>({});
    const [investigations, setInvestigations] = useState<Investigation[]>([]);

    //const [selectedConversationId, setSelectedConversationId]=useState<number>(-1);
    const [selectedInvId, setSelectedInvId] = useState<number>(-1);
    const [selectedProjectId, setSelectedProjectId] = useState<number>(-1);
    const [invOpen, setInvOpen] = useState<Record<number, boolean>>({});
    const [projOpen, setProjOpen] = useState<Record<number, boolean>>({});
    const [open, setOpen] = useState(true);
    const [showInvWindow, setShowInvwindow] = useState(false);
    const [showProjWindow, setShowProjwindow] = useState(false);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [menuState, setMenuState] = useState<"file" | "project" |"investigation"|"conversation"| null>(null);

    async function addFile() {
        prop.setShowWindowFile(true);
    }
    async function addProject() {
        setShowProjwindow(true);
    }
    async function addConv() {
        prop.setNewConv(true);
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
        const token = localStorage.getItem("token");
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
    async function deleteInvestigation() {
        const token = localStorage.getItem("token");
        const response = await fetch("api/investigations/delete", {
            method: "Post",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ id: selectedInvId })
        })
        await loadInvestigations();
        setAnchor(null);

    }
    async function deleteProject() {
        const token = localStorage.getItem("token");
        const id= selectedProjectId;
        const response = await fetch("api/investigations/projects/delete", {
            method: "Post",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ id })
        })
        await loadProjects(selectedInvId);
    }
    async function deleteConversation(){
        const token=localStorage.getItem("token");
        const response=await fetch("api/chat/conversations/delete",{
            method:"POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({id:prop.selectedConversationId})
        })
        await prop.loadConversations(selectedProjectId);

    }
    //open menu
    function openInvMenu(e: MouseEvent, type: "file" | "project" | "conversation" |"investigation") {
        e.stopPropagation();
        setAnchor(e.currentTarget as HTMLElement);
        setMenuState(type);
    }
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
                <IconButton onClick={addInvestigation} /*sx={{color:"#0077b6"}}*/>+</IconButton>
            </Box>

            <Box sx={{ display: "flex", marginLeft: 2, marginRight: 2 }}>
                <TextField size="small" placeholder="Search..." sx={{ borderradius: 3 }} InputProps={{
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

                            <ListItemButton sx={{
                                gap: 1,
                                borderRadius: 1,
                                mx: 0.5,
                                "&:hover": {
                                    backgroundColor: "#f5f5f5"
                                },
                                "&:hover .row-menu": {
                                    opacity: 1
                                }
                            }} onClick={async () => {
                                await loadProjects(inv.id);
                                setInvOpen(s => ({ ...s, [inv.id]: !s[inv.id] }));
                                setSelectedInvId(inv.id);
                            }}>

                                <span style={{ fontFamily: "monospace", fontSize: 16 }}>{isInvOpen ? "><" : "<>"}</span>
                                <ListItemText primary={inv.name}></ListItemText>
                                <IconButton className="row-menu"
                                    size="small"
                                    onClick={(e) => { openInvMenu(e, "investigation"); setSelectedInvId(inv.id); }}
                                    sx={{
                                        p: 0.5,
                                        opacity: 0,
                                        transition: "opacity 0.15s ease"
                                    }}><MoreHorizIcon /></IconButton>

                            </ListItemButton>


                            <Collapse in={isInvOpen} timeout="auto" unmountOnExit>
                                <List disablePadding dense>
                                    {(projectsByInvId[inv.id] ?? []).map(project => {
                                        const isProjOpen = !!projOpen[project.id];
                                        return (
                                            <div key={project.id}>
                                                <ListItemButton sx={{
                                                    pl: 4, gap: 1, py: 0, mt:0.8, mb:0.8,
                                                    borderRadius: 1,
                                                    "&:hover .row-menu": {
                                                        opacity: 1
                                                    }
                                                }} onClick={async () => {
                                                    
                                                    await prop.loadConversations(project.id); 
                                                    setProjOpen(s => ({ ...s, [project.id]: !s[project.id] }));
                                                    setSelectedProjectId(project.id);
                                                    prop.setSelectedProject(project);
                                                    /*if(projOpen[project.id]){
                                                      await prop.loadConversations(project.id);
                                                    } */
                                                   
                                                }}>
                                                    {/*isProjOpen ? "📂" : "📁"*/}
                                                    <span style={{ fontSize: 20, color:"#03045e" }}>{isProjOpen ? "◇" : "◆"}</span>
                                                    <ListItemText sx={{ my: 0 }} primary={project.name}></ListItemText>

                                                    <IconButton
                                                        className="row-menu"
                                                        size="small"
                                                        onClick={(e) => { openInvMenu(e, "project"); setSelectedProjectId(project.id); }}
                                                        sx={{
                                                            p: 0,
                                                            width: 20,
                                                            height: 20,
                                                            opacity: 0,
                                                            transition: "opacity 0.15s ease"
                                                        }}
                                                    >
                                                        <MoreHorizIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>

                                                </ListItemButton>
                                                <Collapse in={isProjOpen} timeout="auto" unmountOnExit>
                                                    <List disablePadding dense>
                                                        {(prop.conversatuionsByProjId[project.id] ?? []).map(conv => {
                                                            //const isConvOpen = !!convOpen[conv.id];
                                                            return (
                                                                <div key={conv.id}>
                                                                    <ListItemButton sx={{
                                                                        pl: 6, gap: 1, py: 0,
                                                                        borderRadius: 1,
                                                                        "&:hover .row-menu": {
                                                                            opacity: 1
                                                                        }
                                                                    }} onClick={async () => {
                                                                        
                                                                        //setConvOpen(s => ({ ...s, [conv.id]: !s[conv.id] }));
                                                                        prop.setSelectedConversationId(conv.id);
                                    
                                                                    }}>
                                                                       
                                                                       <span>💬</span>
                                                                        <ListItemText sx={{ my: 0 }} primary={conv.title}></ListItemText>

                                                                        <IconButton
                                                                            className="row-menu"
                                                                            size="small"
                                                                            onClick={(e) => { openInvMenu(e, "conversation"); setSelectedProjectId(project.id);setSelectedInvId(inv.id); }}
                                                                            sx={{
                                                                                p: 0,
                                                                                width: 20,
                                                                                height: 20,
                                                                                opacity: 0,
                                                                                transition: "opacity 0.15s ease"
                                                                            }}
                                                                        >
                                                                            <MoreHorizIcon sx={{ fontSize: 16 }} />
                                                                        </IconButton>

                                                                    </ListItemButton>
                                                                </div>);


                                                            }
                                                        )

                                                        }
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
        <RowMenu type={menuState} anchor={anchor} setAnchor={setAnchor} addFile={addFile} addProj={addProject} deleteInv={deleteInvestigation} deleteProj={deleteProject} addConversation={addConv} deleteConv={deleteConversation}></RowMenu>
        {showInvWindow &&
            <NewProject isInv={true} open={showInvWindow} setOpen={setShowInvwindow} loadInvestigations={loadInvestigations} loadProjects={loadProjects}></NewProject>
        }
        {showProjWindow &&
            <NewProject isInv={false} invId={selectedInvId} open={showProjWindow} setOpen={setShowProjwindow} loadInvestigations={loadInvestigations} loadProjects={loadProjects}></NewProject>
        }
    </>)

}