import './login.css'
import avatar from "./assets/avatar.png";
import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';

export function Login() {
    const [register,setRegister]=useState(false);
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    const { route } = useLocation();
    async function onClick(){
        if(register)
        {
            const r=await fetch("api/auth/register",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(
                    {
                        email,password
                    }
                ) 
            });
            if(!r.ok){
                const data=await r.text();
                alert(data);
                return;
            }
            setRegister(false);

        }
        else{
            const r=await fetch("api/auth/login",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    email, password
                })
            });
            if(!r.ok){
                const data=await r.text();
                alert(data);
                return;
            }
            const data=await r.json();
            localStorage.setItem("token",data.token);
            route("/chat",true);

        }
    }

    return <div className="login-container">
        <div className="login-card">
            <div className="avatar">
                <img src={avatar} alt="Avatar"></img>
            </div>
            <input type="email" value={email} placeholder="Email address" onInput={e=>setEmail(e.currentTarget.value)}></input>
            <input type="password" value={password} placeholder="Password" onInput={e=>setPassword(e.currentTarget.value)}></input>
            <button className="login-btn" onClick={onClick}>{register ? "Register" : "Login"}</button>
            {!register && <p>Have no account yet? <a href="" onClick={(e)=>{e.preventDefault(); setRegister(true);}}>Register</a></p>}
        
        </div>
    </div>
}