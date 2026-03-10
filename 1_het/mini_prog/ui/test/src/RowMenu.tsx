import { Menu, MenuItem } from "@mui/material";

type rmProps={
    anchor: HTMLElement | null,
    setAnchor: (a:HTMLElement | null)=>void,
    addFile:()=>void,
    addProj:()=>void,
    type:"project" |"file" |null
    /*rename:()=>void,
    delete:()=>void*/


}
export function RowMenu(prop:rmProps){
    return (
        <Menu anchorEl={prop.anchor} open={!!prop.anchor} onClose={()=>prop.setAnchor(null)}>
            <MenuItem onClick={prop.type=="project" ? prop.addProj :prop.addFile}>{prop.type=="project" ? "Add new project": "Add new file"} </MenuItem>
            <MenuItem>Rename</MenuItem>
            <MenuItem>Delete</MenuItem>
        </Menu>
    );
}