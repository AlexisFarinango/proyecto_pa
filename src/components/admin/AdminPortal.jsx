import React, { useState } from "react";
import DirigentesTab from "./DirigentesTab";
import EquiposTab from "./EquiposTab";
import { useNavigate } from "react-router-dom";

export default function AdminPortal() {
  const nav = useNavigate();
  const [tab, setTab] = useState("dirigentes");
  const [downloading, setDownloading] = useState(false); 
  const auth = sessionStorage.getItem("adminBasic");

  const descargarExcel = async () => {
    setDownloading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/users/export`, {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      });
      if (!resp.ok){
        if (resp.status === 401) throw new Error("No autorizado. Inicia sesión como admin.");
        if (resp.status === 413) throw new Error("Archivo demasiado grande.");
        throw new Error(`No se pudo generar el Excel (HTTP ${resp.status})`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jugadores.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
        if (e.name === "AbortError") {
        alert("Tiempo de espera agotado. Vuelve a intentar o usa la opción sin imágenes.");
      } else {
        alert(e.message || "Error descargando el Excel");
      }
    } finally {
      clearTimeout(timeoutId);
      setDownloading(false);                                // <-- NUEVO
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
        <button className="btn-enviar" onClick={descargarExcel} disabled={downloading}>
          {downloading ? "Generando…" : "Exportar Excel"}
        </button>
      </div>

      {tab === "dirigentes" && <DirigentesTab />}
      {tab === "equipos" && <EquiposTab />}
    </div>
  );
}
