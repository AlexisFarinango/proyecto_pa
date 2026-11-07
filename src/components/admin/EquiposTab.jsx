import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 

export default function EquiposTab() {
  const nav = useNavigate();

  const [equipos, setEquipos] = useState([]);
  const [sinCodigo, setSinCodigo] = useState([]);
  const [seleccion, setSeleccion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null);

  const getHeaders = () => {
    const adminBasic = sessionStorage.getItem("adminBasic");
    return {
      "Content-Type": "application/json",
      Authorization: `Basic ${adminBasic || ""}`,
    };
  };

  const ensureSession = () => {
    const adminBasic = sessionStorage.getItem("adminBasic");
    if (!adminBasic) {
      setMsg("Sesión expirada. Inicia sesión otra vez");
      nav("/admin/login", { replace: true });
      return false;
    }
    return true;
  };

  const load = async () => {
    setMsg("");
    if (!ensureSession()) return;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/equipos`,
        { headers: getHeaders() }
      );
      if (resp.status === 401) { ensureSession(); return; }
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error listando equipos");
      setEquipos(data);
      setList(data);
      setSinCodigo(data.filter(e => !e.codigo));
    } catch (e) { setMsg(e.message); }
  };

  useEffect(() => { load(); /* eslint-disable */ }, []);

  const agregar = async () => {
    if (!ensureSession()) return;
    try {
      const body = { equipoId: seleccion, codigo };
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/equipos`,
        { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error agregando código");
      setSeleccion(""); setCodigo("");
      load();
    } catch (e) { setMsg(e.message); }
  };

  const saveEdit = async () => {
    if (!ensureSession()) return;
    try {
      const body = {
        nombre: editing.nombre,
        codigo: editing.codigo,
        dirigenteId: editing.dirigenteId?._id || editing.dirigenteId,
      };
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/equipos/${editing._id}`,
        { method: "PUT", headers: getHeaders(), body: JSON.stringify(body) }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error editando equipo");
      setEditing(null);
      load();
    } catch (e) { setMsg(e.message); }
  };

  const eliminar = async (id) => {
    if (!ensureSession()) return;
    if (!confirm("¿Eliminar registro de equipo? (Solo elimina el documento de Equipo, no jugadores)")) return;
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/equipos/${id}`,
        { method: "DELETE", headers: getHeaders() }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error eliminando equipo");
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      {msg && <p className="error">{msg}</p>}

      <h3 style={{ color: "#ffd600" }}>Agregar código de registro a equipo</h3>

      {/* Grid 3→2→1 columnas */}
      <div className="grid-3 grid-3-wide">
        <div className="campo">
          <label>Equipo (solo los que no tienen código)</label>
          <select value={seleccion} onChange={e => setSeleccion(e.target.value)}>
            <option value="">-- Seleccione --</option>
            {sinCodigo.map(e => (
              <option key={e._id} value={e._id}>
                {e.nombre} (Dirigente: {e.dirigente?.usuario || "N/A"})
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label>Código de registro</label>
          <input value={codigo} onChange={e => setCodigo(e.target.value)} />
        </div>
        <div className="btn-row-end">
          <button className="btn-enviar" onClick={agregar} disabled={!seleccion || !codigo}>
            Agregar
          </button>
        </div>
      </div>

      <h3 style={{ color: "#ffd600", marginTop: 24 }}>Equipos</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="col-num">N°</th>
              <th>Nombre</th>
              <th>Código</th>
              <th>Dirigente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e, i) => (
              <tr key={e._id}>
                <td className="col-num">{i + 1}</td>
                <td>{e.nombre}</td>
                <td className="break-cell">{e.codigo || "-"}</td>
                <td>{e.dirigente?.usuario || "N/A"}</td>
                <td className="actions">
                  <button
                    onClick={() =>
                      setEditing({ ...e, dirigenteId: e.dirigente?._id || e.dirigenteId })
                    }
                  >
                    ✏️
                  </button>{" "}
                  <button onClick={() => eliminar(e._id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {editing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <h3>Editar equipo</h3>
            <div className="campo"><label>Nombre</label>
              <input value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} />
            </div>
            <div className="campo"><label>Código</label>
              <input value={editing.codigo || ""} onChange={e => setEditing({ ...editing, codigo: e.target.value })} />
            </div>
            <p style={{ fontSize: 13 }}>
              * Si el equipo seleccionado ya tiene un código en otro registro, el backend bloqueará el guardado.
            </p>
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
