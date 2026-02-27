import './login.css'
import avatar from "./assets/avatar.png";
import { useState } from 'preact/hooks';
import { route } from 'preact-router';

export function Login() {
    const [register,setRegister]=useState(false);
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");
    async function onClick(){
        if(register)
        {
            const r=await fetch("api/register",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(
                    {
                        email,password
                    }
                ) 
            });
            if(!r.ok){
                alert("Hibás adatok");
                return;
            }
            setRegister(false);
        }
        else{
            const r=await fetch("api/login",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    email, password
                })
            });
            if(!r.ok){
                alert("Hibás adatok");
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
            <input type="email" placeholder="Email address" onChange={e=>setEmail(e.currentTarget.value)}></input>
            <input type="password" placeholder="Password" onChange={e=>setPassword(e.currentTarget.value)}></input>
            <button className="login-btn" onClick={onClick}>{register ? "Register" : "Login"}</button>
            {!register && <p>Have no account yet? <a href="" onClick={(e)=>{e.preventDefault(); setRegister(true);}}>Register</a></p>}
        
        </div>
    </div>
}