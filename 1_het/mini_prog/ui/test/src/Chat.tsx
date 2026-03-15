import { Send } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import { useState } from "preact/hooks";
import { NewConversation } from "./NewConversation";
type Message = {
    id: number,
    role: string,
    content: string

}
export type Conversation ={
    id:number,
    title:string,
    createdAtUtc: Date,
    updatedAtUtc: Date,
    messages: Message[]
}
type cProps={
    newChat:boolean,
    setNewChat: (b: boolean)=>void,
    sellectedProjId:number
}
export function ChatWindow(prop:cProps) {
    const [conversationsByProjId, setConversationsByProjId] = useState<Record<number,Conversation[]>>({});
    const [selectedConversation, setSelectedConversation]=useState<Conversation>();

    async function addConversation(title:string){
        const projectId=prop.sellectedProjId;
        const token=localStorage.getItem("token");
        const response=await fetch("api/chat/conversations/add",{
            method:"POST",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({projectId, title})
        })
        prop.setNewChat(false);
        const data=await response.json();
        setSelectedConversation(data.id);
    }
    /*async function loadConversations(){
        const token=localStorage.getItem("token");
        const projectId=prop.sellectedProjId;
        const response=await fetch("api/chat/conversations/load",{
            method: "POST",
            headers:{
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(projectId)
        })
        const data = await response.json();
        setConversationsByProjId(prev => ({
            ...prev,
            [projectId]: data
        }));
    }*/
    async function addMessage(){}
    return (
        <Paper
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column"
            }}>
            <Box sx={{
                flex: 1,
                p: 2,
                overflowY: "auto",
                border: "1px solid red"
            }}>
                {selectedConversation && selectedConversation.messages.map(m => {
                    return <Box key={m.id} sx={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        <Paper>
                            <Typography>{m.content}</Typography>
                        </Paper>
                    </Box>
                })}

            </Box>
            <Box>
                <TextField placeholder="What do you want to know?"></TextField>
                <IconButton><SendIcon /></IconButton>
            </Box>
             {prop.newChat && <NewConversation open={prop.newChat} setOpen={prop.setNewChat} addConversation={addConversation}></NewConversation>}
        </Paper>
       
        );
}