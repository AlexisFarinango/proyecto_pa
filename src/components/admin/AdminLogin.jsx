import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const nav = useNavigate();

  const login = async () => {
    setMsg("");
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/dirigentes/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error de autenticación");
      if (data.role !== "admin") throw new Error("No eres administrador.");

      sessionStorage.setItem("adminBasic", btoa(`${usuario}:${password}`));
      nav("/admin/portal");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="form-futbol">
      <h2 className="form-titulo">🛡️ Acceso Administrador</h2>
      <div className="campo">
        <label>Usuario</label>
        <input value={usuario} onChange={e => setUsuario(e.target.value)} />
      </div>
      <div className="campo">
        <label>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <button className="btn-enviar" onClick={login}>Entrar</button>
      {msg && <p className="error">{msg}</p>}
    </div>
  );
}
