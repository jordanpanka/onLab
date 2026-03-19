import { useEffect, useState } from 'preact/hooks'
import './app.css'
import { ProjectBar, type Project } from './ProjectBar';
import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import LogoutIcon from "@mui/icons-material/Logout";
import { jwtDecode as decodeJwt } from "jwt-decode";
import { useLocation } from "preact-iso";
import { RightPanel } from './RightPanel';
import avatar from "./assets/avatar.png";
import { Chat } from '@mui/icons-material';
import { ChatWindow, type Conversation } from './Chat';

const HEADER_H = 56;
export type JwtPayload = {
  uid: string
  email: string
  firstname: string
  lastname: string
}
export function App() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("bla bla bla");
  const [file, setFile] = useState<FileList>();
  const [showWindowFile, setShowwindowFile] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  //variables for sidebars
  const [conversationsByProjId, setConversationsByProjId] = useState<Record<number, Conversation[]>>({});
  const [projOpen, setProjOpen] = useState<Record<number, boolean>>({});
  const [selectedProject, setSelectedProject] = useState<Project>();
  const [selectedConversationId,setSelectedConversationId]=useState<number>(-1);
  const [selectedProjectId,setSelectedProjectId]=useState<number>(-1);
  const { route } = useLocation();

  const [isnewConversation, setIsNewConversation] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem("token")) {

      route("/login");
    }
  }, []);
  async function send() {
    setAnswer("Thinking...");

    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await r.json();
    setAnswer(data.answer);
  }


  async function link() {
    if (!file) {
      setUploadResult("Előbb válassz ki egy fájlt!");
      return;
    }

    const data = new FormData();
    for (const f of Array.from(file ?? [])) {
      data.append("files", f);
      data.append("paths", f.webkitRelativePath);
    }
    const token = localStorage.getItem("token");
    const response = await fetch("/api/investigations/projects/files/upload", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: data
    })
    setShowwindowFile(false);

  }
  function setName() {
    const token = localStorage.getItem("token");
    if (!token) return; // nincs bejelentkezve

    const decoded = decodeJwt<JwtPayload>(token);

    setFirstName(decoded.firstname);
    setLastName(decoded.lastname);
  }
  function logout() {

    localStorage.removeItem("token");
    route("/login", true);
  }
  useEffect(() => setName(), []);
  async function loadConversations(id:number) {
    const token = localStorage.getItem("token");
    //const id = selectedProject?.id;
    const response = await fetch("api/chat/conversations/load", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({id})
    })
    const data = await response.json();
    if (id) {
      setConversationsByProjId(prev => ({
        ...prev,
        [id]: data
      }));
    }
  }
 return (
  <>
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backgroundColor: "white",
        color: "black",
        borderBottom: "1px solid #eee",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ height: HEADER_H, backgroundColor: "#03045e" }}>
        <Box sx={{ display: 'flex', alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Typography sx={{ fontWeight: 600, fontSize: 30, color: "white" }}>
            Mini chat
          </Typography>
          <Box sx={{ display: 'flex', alignItems: "center", gap: 2 }}>
            <Avatar sx={{ width: 32, height: 32 }}>
              <img src={avatar} alt="Avatar" />
            </Avatar>
            <Typography sx={{ color: "white" }}>
              {lastName} {firstName}
            </Typography>
            <IconButton onClick={logout}>
              <LogoutIcon sx={{ color: "white" }} />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>

    <Box
      sx={{
        display: "flex",
        height: `calc(100vh - 56px)`,
        mt: `${HEADER_H}px`,
        overflow:"hidden",
        minHeight: 0
      }}
    >
      <ProjectBar
        setSelectedProject={setSelectedProject}
        shoWindowFile={showWindowFile}
        setShowWindowFile={setShowwindowFile}
        loadConversations={loadConversations}
        conversatuionsByProjId={conversationsByProjId}
        newConv={isnewConversation}
        setNewConv={setIsNewConversation}
        selectedConversationId={selectedConversationId}
        setSelectedConversationId={setSelectedConversationId}
      />

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          justifyContent: "center",
          width:"100%",
          overflow:'hidden'
          
        }}
      >
        {selectedProjectId!=-1 && (
          <ChatWindow
            newChat={isnewConversation}
            setNewChat={setIsNewConversation}
            sellectedProjId={selectedProjectId}
            selectedCOnversationId={selectedConversationId}
            setSelectedConversationId={setSelectedConversationId}
          />
        )}
      </Box>

      {selectedProject && selectedProjectId!=-1 && (
        <RightPanel
          projectSelected={selectedProject}
          projOpen={projOpen}
          setProjOpen={setProjOpen}
          showWindowAddfile={showWindowFile}
          setShowWindowAddFile={setShowwindowFile}
        />
      )}
    </Box>
  </>
);
}

