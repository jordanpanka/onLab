import { Menu, MenuItem } from "@mui/material";

type rmProps={
    anchor: HTMLElement | null,
    setAnchor: (a:HTMLElement | null)=>void,
    addInv:()=>void,
    /*rename:()=>void,
    delete:()=>void*/


}
export function RowMenu(prop:rmProps){
    return (
        <Menu anchorEl={prop.anchor} open={!!prop.anchor} onClose={()=>prop.setAnchor(null)}>
            <MenuItem onClick={prop.addInv}>Add new file</MenuItem>
            <MenuItem>Rename</MenuItem>
            <MenuItem>Delete</MenuItem>
        </Menu>
    );
}