import { Menu, MenuItem } from "@mui/material";

type rmProps = {
    anchor: HTMLElement | null,
    setAnchor: (a: HTMLElement | null) => void,
    addFile: () => void,
    addProj: () => void,
    type: "project" | "file" | "conversation" |"investigation" | null
    /*rename:()=>void,*/
    deleteInv: () => void,
    deleteProj: () => void,
    //deleteConv: () => void,
    addConversation: () => void


}
export function RowMenu(prop: rmProps) {
    async function handleAddClick() {
        switch (prop.type) {
            case "investigation":
                prop.addProj();
                return;
            case "file":
                prop.addFile();
                return;
        }
    }
    async function deleteClick() {
        switch (prop.type) {
            case "investigation":

                prop.deleteInv();
                return;
            case "project":

                prop.deleteProj();
                return;

            case "conversation":
               // prop.deleteConv();
                return;

        }

    }
    return (
        <Menu anchorEl={prop.anchor} open={!!prop.anchor} onClose={() => prop.setAnchor(null)}>
            {prop.type == "file" && <MenuItem onClick={prop.addConversation}>Add new conversation</MenuItem>}
            <MenuItem onClick={handleAddClick}>{prop.type == "project" ? "Add new project" : "Add new file"} </MenuItem>
            <MenuItem>Rename</MenuItem>
            <MenuItem onClick={deleteClick}>Delete</MenuItem>
        </Menu>
    );
}