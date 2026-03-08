import { useEffect, useState } from 'preact/hooks'
import { UploadFile } from './uploadFile';
import './app.css'
import { ProjectBar, type Project } from './ProjectBar';
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import LogoutIcon from "@mui/icons-material/Logout";
import { jwtDecode as decodeJwt } from "jwt-decode";
import { useLocation } from "preact-iso";
import { NewProject } from './NewProject';
import { RightPanel } from './RightPanel';

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
  const [projectsByInvId, setProjectsByInvId] = useState<Record<number, Project[]>>({});
  const [invOpen, setInvOpen] = useState<Record<number, boolean>>({});
  const [projOpen, setProjOpen] = useState<Record<number, boolean>>({});
  const [selectedProject, setSelectedProject]=useState<Project>();
  const { route } = useLocation();
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
    const token=localStorage.getItem("token");
    const response = await fetch("/api/investigations/projects/files/upload", {
      method: "POST",
      headers:{"Authorization": "Bearer " + token},
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
  function logout(){
    
    localStorage.removeItem("token");
    route("/login",true);
  }
  useEffect(() => setName(), []);
  return (
    <>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          backgroundColor: "white",
          color: "black",
          borderBottom: "1px solid #eee",
          zIndex: (theme) => theme.zIndex.drawer + 1, // fontos: legyen a Drawer felett
        }}
      >
        <Toolbar sx={{ height: HEADER_H }}>
          <Box sx={{ display: 'flex', alignItems: "center", justifyContent: "space-between", width: "100%", }}>
            <Typography sx={{ fontWeight: 600 }}>Mini chat</Typography>
            <Box sx={{ display: 'flex', alignItems: "center", gap: 2 }}>
              <Typography>{lastName} {firstName}</Typography>
              <IconButton onClick={logout}><LogoutIcon /></IconButton>
            </Box>
          </Box>


        </Toolbar>
      </AppBar>

      {/* SIDEBAR */}
      <ProjectBar></ProjectBar>
      <Box>
        <div className="input-row">
          <input className="prompt" value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)} placeholder={"What do you want to know?"}>
          </input>
          <button className="link-btn" onClick={() => setShowwindowFile(true)}><span className="material-icons">attach_file</span></button>
          <button className="send-btn" onClick={send}>Send</button>
        </div>
        <h2>Answer</h2>
        <div className="answer">
          {answer}
        </div>
        {showWindowFile && <div className="modal-overlay">
          <div className="modal-window">
            <UploadFile setFile={setFile} link={link} answer={uploadResult}></UploadFile>
          </div>
        </div>}
       
      </Box>
       {selectedProject &&
      <RightPanel projectSelected={selectedProject} projOpen={projOpen} setProjOpen={setProjOpen}></RightPanel>
       }
    </>
  )
}

