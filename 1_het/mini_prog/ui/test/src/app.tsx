import { useState } from 'preact/hooks'
import { UploadFile } from './uploadFile';
import './app.css'

export function App() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("bla bla bla");
  const [file, setFile] = useState<File | null>(null);
  const [showWindow, setShowwindow] = useState(false);
  const [uploadResult,setUploadResult]=useState("");

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
    data.append("document", file);
    

    const response = await fetch("/api/docs", {
      method: "POST",
      body: data
    })
    setShowwindow(false);

  }
  return (
    <>
      <h1>Mini chat</h1>
      <div className="input-row">
        <input className="prompt" value={prompt} onChange={(e) => setPrompt(e.currentTarget.value)} placeholder={"What do you want to know?"}>
        </input>
        <button className="link-btn" onClick={() => setShowwindow(true)}><span className="material-icons">attach_file</span></button>
        <button className="send-btn" onClick={send}>Send</button>
      </div>
      <h2>Answer</h2>
      <div className="answer">
        {answer}
      </div>
      {showWindow && <div className="modal-overlay">
        <div className="modal-window">
        <UploadFile setFile={setFile} link={link} answer={uploadResult}></UploadFile>
        </div>
      </div>}
    </>
  )
}
