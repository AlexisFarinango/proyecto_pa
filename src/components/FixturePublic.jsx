import React, { useEffect, useState } from "react";

function formatFechaCabecera(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const formatFechaPartido = (raw) => {
  if (!raw) return "Fecha pendiente de asignación";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "Fecha pendiente de asignación";

  return d.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function FixturePublic() {
  const [fechas, setFechas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg("");
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/fixture`);
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || "Error cargando fixture");
        setFechas(data || []);
      } catch (e) {
        setMsg(e.message || "Error cargando fixture");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="form-futbol">
      <h2 className="form-titulo">📅 Programación de partidos</h2>

      {loading && <p>Cargando…</p>}
      {msg && <p className="error">{msg}</p>}

      {/* GRID DE 2 COLUMNAS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {fechas.map((f) => (
          <div
            key={f._id}
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#000",
              borderRadius: 12,
              padding: 16,
              minWidth: 0,              // IMPORTANTE para que el grid no explote
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ margin: 0, color: "#c62828", fontSize: 18 }}>
              {f.titulo || `Fecha ${f.numeroFecha}`}
            </h3>

            {f.fechaCabecera && (
              <p style={{ marginTop: 4, fontWeight: "bold" }}>
                Jornada: {formatFechaCabecera(f.fechaCabecera)}
              </p>
            )}

            {(!f.partidos || f.partidos.length === 0) && (
              <p>No hay partidos definidos para esta fecha.</p>
            )}

            {f.partidos && f.partidos.length > 0 && (
              <table
                style={{
                  width: "100%",
                  marginTop: 10,
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 6 }}>Equipo 1</th>
                    <th style={{ textAlign: "left", paddingBottom: 6 }}>Equipo 2</th>
                    <th style={{ textAlign: "left", paddingBottom: 6 }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {f.partidos.map((p) => (
                    <tr key={p._id}>
                      <td style={{ padding: "4px 0" }}>
                        {p.equipo1?.nombre || "—"}
                      </td>
                      <td style={{ padding: "4px 0" }}>
                        {p.equipo2?.nombre || "—"}
                      </td>
                      <td style={{ padding: "4px 0" }}>
                        {formatFechaPartido(p.fechaPartido)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {!loading && !msg && fechas.length === 0 && (
        <p>No hay programación de partidos cargada aún.</p>
      )}
    </div>
  );
}
