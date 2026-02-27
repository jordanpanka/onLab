import './login.css'
import avatar from "./assets/avatar.png";
import { useState } from 'preact/hooks';

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



        }
    }

    return <div className="login-container">
        <div className="login-card">
            <div className="avatar">
                <img src={avatar} alt="Avatar"></img>
            </div>

            <input type="email" value="email"placeholder="Email address"></input>
            <input type="password" value="password" placeholder="Password"></input>
            <button className="login-btn">{register ? "Register" : "Login"}</button>
            {!register && <p>Have no account yet? <a href="" onClick={(e)=>{e.preventDefault(); setRegister(true);}}>Register</a></p>}
        
        </div>
    </div>
}