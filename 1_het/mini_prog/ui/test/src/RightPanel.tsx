import { Box, Collapse, Drawer, IconButton, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useState } from "preact/hooks";
import { buildTree, FolderTree, type FileItem } from "./FolderTree";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import type { Project } from "./ProjectBar";

const openWidth = 70;
const closedWidth = 10;
const HEADER_H = 64;
type RightPanelProps = {
    projectSelected: Project,
    projOpen: Record<number, boolean>,
    setProjOpen: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
}

export function RightPanel(rpProps: RightPanelProps) {
    const [open, setOpen] = useState(true);
    const [filesByProjId, setFilesByProjId] = useState<Record<number, FileItem[]>>([]);
    async function loadFiles(id: number) {
        const response = await fetch("api/investigations/projects/files/load", {
            method: "Get",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        })
        const data = await response.json();
        setFilesByProjId(data);
    }
    const isProjOpen = !!rpProps.projOpen[rpProps.projectSelected.id];
    const files = filesByProjId[rpProps.projectSelected.id] ?? [];
    const tree = buildTree(files);
    return (<>
        <Drawer variant="persistent" anchor="right" open={open} sx={{
            width: open ? openWidth : closedWidth, gap: 2, "& .MuiDrawer-paper": {
                width: open ? openWidth : closedWidth,
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
                }}>Files</Typography>

            </Box>
            <List disablePadding dense>

                <div key={rpProps.projectSelected.id}>
                    <ListItemButton onClick={async () => {
                        await loadFiles(rpProps.projectSelected.id);
                        rpProps.setProjOpen(s => ({ ...s, [rpProps.projectSelected.id]: !s[rpProps.projectSelected.id] }));
                    }}>
                        <ListItemText primary={rpProps.projectSelected.name}></ListItemText>
                        {isProjOpen ? <ExpandMore /> : <ExpandLess />}

                    </ListItemButton>
                    <Collapse in={isProjOpen} timeout="auto" unmountOnExit>
                        <List disablePadding dense>
                            <FolderTree node={tree} level={1} onFileClick={() => { }}></FolderTree>
                        </List>
                    </Collapse>
                </div>
            </List>
        </Drawer>
    </>);
}