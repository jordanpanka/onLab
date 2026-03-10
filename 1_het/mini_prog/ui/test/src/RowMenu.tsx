import { Menu, MenuItem } from "@mui/material";

type rmProps={
    anchor: HTMLElement | null,
    setAnchor: (a:HTMLElement | null)=>void,
    addInv:()=>void,
    addProj:()=>void,
    type:"project" |"investigation" |null
    /*rename:()=>void,
    delete:()=>void*/


}
export function RowMenu(prop:rmProps){
    return (
        <Menu anchorEl={prop.anchor} open={!!prop.anchor} onClose={()=>prop.setAnchor(null)}>
            <MenuItem onClick={prop.type=="investigation" ? prop.addInv :prop.addProj}>Add new project</MenuItem>
            <MenuItem>Rename</MenuItem>
            <MenuItem>Delete</MenuItem>
        </Menu>
    );
}