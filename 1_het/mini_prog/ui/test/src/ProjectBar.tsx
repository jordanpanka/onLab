import { Box, Collapse, IconButton, InputAdornment, List, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState, type Dispatch, type StateUpdater } from "preact/hooks"
import { buildTree, FolderTree, type FileItem } from "./FolderTree";
import { NewProject } from "./NewProject";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { RowMenu } from "./RowMenu";
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
const HEADER_H = 64;
export function ProjectBar({ setSelectedProject }: { setSelectedProject: Dispatch<StateUpdater<Project | undefined>> }
) {
    const [filesByProjId, setFilesByProjId] = useState<Record<number, FileItem[]>>({});
    const [projectsByInvId, setProjectsByInvId] = useState<Record<number, Project[]>>({});
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [selectedInvId, setSelectedInvId] = useState<number>(-1);
    const [selectedProjectId, setSelectedProjectId] = useState<number>(-1);
    const [invOpen, setInvOpen] = useState<Record<number, boolean>>({});
    const [projOpen, setProjOpen] = useState<Record<number, boolean>>({});
    const [open, setOpen] = useState(true);
    const [showInvWindow, setShowInvwindow] = useState(false);
    const [showProjWindow, setShowProjwindow] = useState(false);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [menuState,setMenuState]=useState<"investigation" | "project" | null>(null);

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
    async function deleteInvestigation(){
        const token=localStorage.getItem("token");
        const response=await fetch("api/investigations/delete",{
            method:"Post",
            headers:{"Content-Type": "application/json","Authorization": "Bearer " + token},
            body: JSON.stringify({selectedInvId})
        })

    }
    async function deleteProject(){
        const token=localStorage.getItem("token");
        const response=await fetch("api/investigations/projects/delete",{
            method:"Post",
            headers:{"Content-Type": "application/json","Authorization": "Bearer " + token},
            body: JSON.stringify({selectedProjectId})
        })
    }
    //open menu
    function openInvMenu(e: MouseEvent, type: "investigation" |"project") {
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
                <IconButton onClick={addInvestigation}>+</IconButton>
            </Box>

            <Box sx={{ display: "flex", marginLeft: 2, marginRight: 2 }}>
                <TextField size="small" placeholder="Search..." sx={{borderradius: 3}}InputProps={{
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
                                {/*isInvOpen ? <ExpandMore /> : <ExpandLess />*/}
                                <span style={{ fontFamily: "monospace", fontSize: 16 }}>{isInvOpen ? "><" : "<>"}</span>
                                <ListItemText primary={inv.name}></ListItemText>
                                <IconButton className="row-menu"
                                    size="small"
                                    onClick={(e) => openInvMenu(e, "investigation")}
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
                                        const files = filesByProjId[project.id] ?? [];
                                        const tree = buildTree(files);

                                        return (
                                            <div key={project.id}>
                                                <ListItemButton sx={{
                                                    pl: 4, gap: 1, py: 0,
                                                    borderRadius: 1,
                                                    "&:hover .row-menu": {
                                                        opacity: 1
                                                    }
                                                }} onClick={async () => {
                                                    //await loadConversation(project.id);
                                                    setProjOpen(s => ({ ...s, [project.id]: !s[project.id] }));
                                                    setSelectedProjectId(project.id);
                                                    setSelectedProject(project);
                                                }}>
                                                    {isProjOpen ? "📂" : "📁"}
                                                    <ListItemText sx={{ my: 0 }} primary={project.name}></ListItemText>

                                                    <IconButton
                                                        className="row-menu"
                                                        size="small"
                                                        onClick={(e) => openInvMenu(e,"project")}
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
        <RowMenu type={menuState} anchor={anchor} setAnchor={setAnchor} addInv={addInvestigation} addProj={addProject}></RowMenu>
        {showInvWindow && /*<div className="modal-overlay">
            <div className="modal-window">*/
                <NewProject isInv={true} open={showInvWindow} setOpen={setShowInvwindow} loadInvestigations={loadInvestigations}></NewProject>
            /*</div>
        </div>*/}
        {showProjWindow && /*<div className="modal-overlay">
            <div className="modal-window">*/
                <NewProject isInv={false} invId={selectedInvId} open={showProjWindow} setOpen={setShowInvwindow} loadInvestigations={loadInvestigations}></NewProject>
            /*</div>
        </div >*/}
    </>)

}