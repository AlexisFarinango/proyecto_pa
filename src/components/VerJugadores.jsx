import React, { useState } from "react";

export default function VerJugadores() {
  const [codigo, setCodigo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const buscar = async () => {
    setLoading(true);
    setMsg("");
    setJugadores([]);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/equipos/${encodeURIComponent(codigo)}/jugadores`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error obteniendo jugadores");
      setEquipo(data.equipo);
      setJugadores(data.jugadores || []);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-futbol">
      <h2 className="form-titulo">👀 Ver jugadores por código de equipo</h2>
      <div className="campo">
        <label>Código de registro del equipo</label>
        <input value={codigo} onChange={e => setCodigo(e.target.value)} />
      </div>
      <button className="btn-enviar" onClick={buscar} disabled={loading}>Buscar</button>

      {msg && <p className="error">{msg}</p>}

      {equipo && <h3 style={{ color: "#ffd600" }}>Equipo: {equipo}</h3>}

      {jugadores.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", background: "#fff", color: "#000", borderRadius: 8 }}>
            <thead>
              <tr>
                <th>Nombres</th><th>Apellidos</th><th>Fecha Nac.</th><th>Edad</th><th>Identificación</th><th>Número</th><th>Equipo</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map(j => (
                <tr key={j._id}>
                  <td>{j.firstName}</td>
                  <td>{j.lastName}</td>
                  <td>{new Date(j.dob).toLocaleDateString()}</td>
                  <td>{j.age}</td>
                  <td>{j.identificacion}</td>
                  <td>{j.numjugador}</td>
                  <td>{j.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
