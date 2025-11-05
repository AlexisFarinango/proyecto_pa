import React, { useEffect, useState } from "react";
import ModalEdicion from "./ModalEdicion";
import { useNavigate } from "react-router-dom";

export default function PanelDirigente() {
  const dirigenteId = sessionStorage.getItem("dirigenteId");
  const equipoNombre = sessionStorage.getItem("equipoNombre");
  const nav = useNavigate();

  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!dirigenteId) {
      nav("/dirigente");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/dirigentes/${dirigenteId}/jugadores`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || "Error cargando jugadores");
        setJugadores(data);
      } catch (e) {
        setMsg(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [dirigenteId, nav]);

  const descargarWord = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/jugadores/reporte/${dirigenteId}`);
      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.message || "No se pudo generar el reporte");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${equipoNombre}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const descargarPDF = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/jugadores/reporte-pdf/${dirigenteId}`);
      const ct = resp.headers.get('content-type') || '';

      if (!resp.ok || !ct.includes('application/pdf')) {
        const msg = ct.includes('application/json') ? (await resp.json()).message : await resp.text();
        throw new Error(msg || 'No se pudo generar el PDF');
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${equipoNombre}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMsg(e.message);
    }
  };


  const eliminar = async (id) => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/jugadores/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error eliminando");
      setJugadores(prev => prev.filter(j => j._id !== id));
      setConfirmDel(null);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    nav("/");
  };

  return (
    <div className="form-futbol">
      <div className="btn-row-right">
        <button className="btn-cerrar" onClick={logout}>Cerrar Sesión</button>
      </div>
      <h2 className="form-titulo">👥 Jugadores del equipo: {equipoNombre}</h2>

      {msg && <p className="error">{msg}</p>}
      {loading && <p>Cargando...</p>}

      {!loading && jugadores.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", background: "#fff", color: "#000", borderRadius: 8 }}>
            <thead>
              <tr>
                <th>Nombres</th><th>Apellidos</th><th>Fecha Nac.</th><th>Edad</th><th>Identificación</th><th>Número</th><th>Equipo</th><th>Acciones</th>
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
                  <td>
                    <button onClick={() => setEditing(j)}>✏️</button>{" "}
                    <button onClick={() => setConfirmDel(j)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button className="btn-enviar" onClick={descargarPDF} style={{ marginTop: 16 }}>
        📄 Imprimir Reporte de Jugadores PDF
      </button>

      {/* Modal edición */}
      {editing && (
        <ModalEdicion
          jugador={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setJugadores(prev => prev.map(j => j._id === updated._id ? updated : j));
            setEditing(null);
          }}
        />
      )}

      {/* Modal eliminar */}
      {confirmDel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>¿Está seguro de eliminar al jugador <b>{confirmDel.firstName} {confirmDel.lastName}</b>?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-enviar" onClick={() => eliminar(confirmDel._id)}>Aceptar</button>
              <button className="btn-cerrar" onClick={() => setConfirmDel(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
