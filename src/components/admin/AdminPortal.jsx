import React, { useState } from "react";
import DirigentesTab from "./DirigentesTab";
import EquiposTab from "./EquiposTab";
import { useNavigate } from "react-router-dom";

export default function AdminPortal() {
  const nav = useNavigate();
  const [tab, setTab] = useState("dirigentes");
  const auth = sessionStorage.getItem("adminBasic");

  const descargarExcel = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/users/export`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      if (!resp.ok) throw new Error("No se pudo generar el Excel");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jugadores.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  };

  if (!auth) {
    return <div className="form-futbol"><p className="error">No autenticado como admin.</p></div>;
  }
  const logout = () => {
    sessionStorage.clear();
    nav("/");
  };

  return (
    <div className="form-futbol">
      <div className="btn-row-right">
        <button className="btn-cerrar" onClick={logout}>Cerrar Sesión</button>
      </div>
      <h2 className="form-titulo">🛠️ Portal Admin</h2>

      <div className="btn-group tabs-group">
        <button
          className="btn-enviar"
          aria-pressed={tab === "dirigentes"}
          onClick={() => setTab("dirigentes")}
        >
          Dirigentes
        </button>
        <button
          className="btn-enviar"
          aria-pressed={tab === "equipos"}
          onClick={() => setTab("equipos")}
        >
          Equipos
        </button>
        <button className="btn-enviar" onClick={descargarExcel}>
          Exportar Excel
        </button>
      </div>

      {tab === "dirigentes" && <DirigentesTab />}
      {tab === "equipos" && <EquiposTab />}
    </div>
  );
}
