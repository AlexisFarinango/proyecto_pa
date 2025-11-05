import React, { useEffect, useState } from "react";

export default function DirigentesTab() {
  const auth = sessionStorage.getItem("adminBasic");
  const [list, setList] = useState([]);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [equipo, setEquipo] = useState("");
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null);

  const headers = { "Content-Type": "application/json", Authorization: `Basic ${auth}` };

  const load = async () => {
    setMsg("");
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dirigentes`, { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error listando dirigentes");
      setList(data);
    } catch (e) {
      setMsg(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable */ }, []);

  const crear = async () => {
    setMsg("");
    try {
      const body = { usuario, password, nombre: equipo };
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dirigentes`, {
        method: "POST", headers, body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error creando dirigente");
      setUsuario(""); setPassword(""); setEquipo("");
      load();
    } catch (e) { setMsg(e.message); }
  };

  const saveEdit = async () => {
    try {
      const body = { usuario: editing.usuario, password: editing.password, nombre: editing.nombre };
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dirigentes/${editing._id}`, {
        method: "PUT", headers, body: JSON.stringify(body)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error editando dirigente");
      setEditing(null); load();
    } catch (e) { setMsg(e.message); }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar dirigente? También liberará la relación del equipo.")) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dirigentes/${id}`, { method: "DELETE", headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error eliminando dirigente");
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      <h3 style={{ color: "#ffd600" }}>Crear dirigente</h3>
      {msg && <p className="error">{msg}</p>}

      {/* Grid 3→2→1 columnas */}
      <div className="grid-3">
        <div className="campo">
          <label>Usuario</label>
          <input value={usuario} onChange={e=>setUsuario(e.target.value)} />
        </div>
        <div className="campo">
          <label>Contraseña</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div className="campo">
          <label>Nombre del equipo</label>
          <input value={equipo} onChange={e=>setEquipo(e.target.value)} />
        </div>
      </div>

      <div className="btn-row-right">
        <button className="btn-enviar" onClick={crear}>Crear</button>
      </div>

      <h3 style={{ color: "#ffd600", marginTop: 24 }}>Dirigentes</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Contraseña</th>
              <th>Equipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map(d => (
              <tr key={d._id}>
                <td>{d.usuario}</td>
                <td className="break-cell">{d.password}</td>
                <td>{d.nombre}</td>
                <td className="actions">
                  <button onClick={() => setEditing(d)}>✏️</button>{" "}
                  <button onClick={() => eliminar(d._id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* Modal editar */}
      {editing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3>Editar dirigente</h3>
            <div className="campo"><label>Usuario</label>
              <input value={editing.usuario} onChange={e => setEditing({ ...editing, usuario: e.target.value })} />
            </div>
            <div className="campo"><label>Contraseña</label>
              <input value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} />
            </div>
            <div className="campo"><label>Nombre del equipo</label>
              <input value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-enviar" onClick={saveEdit}>Guardar</button>
              <button className="btn-cerrar" onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
