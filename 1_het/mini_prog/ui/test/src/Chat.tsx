import { Send } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import { useState } from "preact/hooks";
type Message = {
    id: number,
    role: string,
    content: string

}
type Conversation ={
    title:string,
    createdAtUtc: Date,
    updatedAtUtc: Date,
    messages: Message[]
}
export function Chat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation]=useState<Conversation>();

    async function addConversation(){

    }
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

        </Paper>);
}