import { Send } from "@mui/icons-material";
import SendIcon from "@mui/icons-material/Send";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "preact/hooks";
import { NewConversation } from "./NewConversation";
type Message = {
    id: number,
    role: string,
    content: string

}
export type Conversation = {
    id: number,
    title: string,
    createdAtUtc: Date,
    updatedAtUtc: Date,
    messages: Message[]
}
type cProps = {
    newChat: boolean,
    setNewChat: (b: boolean) => void,
    sellectedProjId: number,
    selectedCOnversationId: number
}
export function ChatWindow(prop: cProps) {
    const [conversationsByProjId, setConversationsByProjId] = useState<Record<number, Conversation[]>>({});
    const [messagesByConvId, setMessagesByConvId] = useState<Record<number, Message[]>>({});
    // const [selectedConversation, setSelectedConversation] = useState<Conversation>();
    const [prompt, setPrompt] = useState("");
    const [answer, setAnswer] = useState("kezdő");

    async function addConversation(title: string) {
        const projectId = prop.sellectedProjId;
        const token = localStorage.getItem("token");
        const response = await fetch("api/chat/conversations/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ projectId, title })
        })
        prop.setNewChat(false);
        const data = await response.json();
        //setSelectedConversation(data);
    }

    async function addMessage(content: string, role: string) {
        const token = localStorage.getItem("token");
        const r = await fetch("api/chat/conversations/messages/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ convId: prop.selectedCOnversationId, content, role })
        })
        await loadMessages();
    }
    async function send() {
        await addMessage(prompt, "User")
        setAnswer("Thinking...");
        const token = localStorage.getItem("token");
        const r = await fetch("/api/chat/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ prompt }),
        });

        const data = await r.json();
        setAnswer(data.answer);
        setPrompt("");
        await addMessage(data.answer, "AI");
        

    }
    async function loadMessages() {
        const token = localStorage.getItem("token");
        const r = await fetch("api/chat/conversations/messages/load", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ id: prop.selectedCOnversationId })
        })

        const data = await r.json();
        setMessagesByConvId(prev => ({
            ...prev,
            [prop.selectedCOnversationId]: data
        }));
    }
    useEffect(() => { loadMessages(); }, [prop.selectedCOnversationId])
    return (
        <Paper
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                width:"600px"
            }}>
            {messagesByConvId[prop.selectedCOnversationId] != null &&
                <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    p: 2,
                    overflowY: "auto",
                    border: "1px solid blue"
                }}>
                    {messagesByConvId[prop.selectedCOnversationId].map(m => {
                        return <Box key={m.id} sx={{ display: "flex", justifyContent: m.role === "User" ? "flex-end" : "flex-start" }}>
                            <Paper>
                                <Typography>{m.content}</Typography>
                            </Paper>
                        </Box>
                    })}

                </Box>
            }

            <Box>
                <TextField sx={{width:"550px"}} value={prompt} onChange={(e) => { setPrompt(e.currentTarget.value) }} placeholder="What do you want to know?"></TextField>
                <IconButton onClick={send}><SendIcon /></IconButton>
            </Box>
            {prop.newChat && <NewConversation open={prop.newChat} setOpen={prop.setNewChat} addConversation={addConversation}></NewConversation>}
        </Paper>

    );
}