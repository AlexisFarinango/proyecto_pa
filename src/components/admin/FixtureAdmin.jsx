import React, { useEffect, useState } from "react";

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  // datetime-local => YYYY-MM-DDTHH:mm
  return d.toISOString().slice(0, 16);
}


export default function FixtureAdmin() {
  const [equipos, setEquipos] = useState([]);
  const [fechas, setFechas] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const auth = sessionStorage.getItem("adminBasic");
  const [modalMessage, setModalMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

  const showMsg = (text) => {
    setModalMessage(text);
    setShowModal(true);
  };

  // Cargar equipos para los select
  useEffect(() => {
    const loadEquipos = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_API_URL}/api/admin/equipos`,
          {
            headers: { Authorization: `Basic ${auth}` },
          }
        );
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || "Error cargando equipos");
        setEquipos(data || []);
      } catch (e) {
        setMsg(e.message || "Error cargando equipos");
      }
    };

    if (auth) loadEquipos();
  }, [auth]);

  // Cargar fixture
  const loadFixture = async () => {
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

  useEffect(() => {
    loadFixture();
  }, []);
  

  // Seleccionar una fecha para edición
  const selectFecha = (f) => {
    setSelectedId(f._id);
    setEditing({
      _id: f._id,
      numeroFecha: f.numeroFecha,
      titulo: f.titulo || `Fecha ${f.numeroFecha}`,
      fechaCabecera: f.fechaCabecera
        ? f.fechaCabecera.slice(0, 10)
        : "",
      partidos: (f.partidos || []).map((p) => ({
        _id: p._id,
        equipo1: p.equipo1?._id || p.equipo1,
        equipo2: p.equipo2?._id || p.equipo2,
        fechaPartido: toInputDate(p.fechaPartido),
        valor_adicional_eq1: p.valor_adicional_eq1 || [],
        valor_adicional_eq2: p.valor_adicional_eq2 || [],
      })),
    });
  };

  // Nueva fecha vacía
  const nuevaFecha = () => {
    const maxNumero =
      fechas.reduce((max, f) => Math.max(max, f.numeroFecha || 0), 0) || 0;

    const next = maxNumero + 1;

    setSelectedId(null);
    setEditing({
      numeroFecha: next,
      titulo: `Fecha ${next}`,
      fechaCabecera: "",
      partidos: [],
    });
  };

  const updateField = (field, value) => {
    setEditing((prev) => ({ ...prev, [field]: value }));
  };

  const addPartido = () => {
    setEditing((prev) => ({
      ...prev,
      partidos: [
        ...(prev.partidos || []),
        {
          equipo1: "",
          equipo2: "",
          fechaPartido: "",
          valor_adicional_eq1: [],
          valor_adicional_eq2: [],
        },
      ],
    }));
  };

  const removePartido = (idx) => {
    setEditing((prev) => ({
      ...prev,
      partidos: prev.partidos.filter((_, i) => i !== idx),
    }));
  };

  const updatePartidoField = (idx, field, value) => {
    setEditing((prev) => {
      const copia = [...(prev.partidos || [])];
      const target = { ...(copia[idx] || {}) };

      if (field === "valor_adicional_eq1" || field === "valor_adicional_eq2") {
        target[field] = value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else {
        target[field] = value;
      }
      copia[idx] = target;
      return { ...prev, partidos: copia };
    });
  };

  const guardar = async () => {
    if (!editing) return;
    setSaving(true);
    setMsg(""); // si ya no quieres texto abajo, puedes quitar esto

    const payload = {
      numeroFecha: Number(editing.numeroFecha),
      titulo: editing.titulo,
      fechaCabecera: editing.fechaCabecera || null,
      partidos: (editing.partidos || []).map((p) => ({
        equipo1: p.equipo1 || null,
        equipo2: p.equipo2 || null,
        fechaPartido: p.fechaPartido || null,
        valor_adicional_eq1: p.valor_adicional_eq1 || [],
        valor_adicional_eq2: p.valor_adicional_eq2 || [],
      })),
    };

    try {
      const isUpdate = !!selectedId;
      const url = isUpdate
        ? `${import.meta.env.VITE_API_URL}/api/fixture/${selectedId}`
        : `${import.meta.env.VITE_API_URL}/api/fixture`;
      const method = isUpdate ? "PUT" : "POST";

      const resp = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error guardando fixture");

      await loadFixture();
      if (data._id) selectFecha(data);

      // ✅ mensaje en modal
      showMsg("✅ Guardado correctamente.");
    } catch (e) {
      // ❌ error en modal
      showMsg(`❌ ${e.message || "Error guardando fixture"}`);
    } finally {
      setSaving(false);
    }
  };


  const eliminarFecha = async () => {
    if (!selectedId) return;
    if (!window.confirm("¿Eliminar esta fecha completa?")) return;
    setSaving(true);
    setMsg("");
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/fixture/${selectedId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error eliminando fecha");

      setEditing(null);
      setSelectedId(null);
      await loadFixture();
    } catch (e) {
      setMsg(e.message || "Error eliminando fecha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ color: "#ffd600" }}>⚙️ Administrar Fixture</h3>

      {msg && <p className="error">{msg}</p>}
      {loading && <p>Cargando fixture…</p>}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Lista de fechas existentes */}
        <div style={{ minWidth: 220 }}>
          <button className="btn-enviar" onClick={nuevaFecha}>
            ➕ Nueva fecha
          </button>
          <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: 12 }}>
            {fechas.map((f) => (
              <li key={f._id} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  className="btn-enviar"
                  style={{
                    width: "100%",
                    backgroundColor:
                      selectedId === f._id ? "#0b2a6d" : undefined,
                  }}
                  onClick={() => selectFecha(f)}
                >
                  {f.titulo || `Fecha ${f.numeroFecha}`}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Editor de la fecha seleccionada */}
        <div
          style={{
            flex: 1,
            background: "rgba(0,0,0,0.3)",
            padding: 16,
            borderRadius: 12,
          }}
        >
          {!editing && <p>Selecciona una fecha o crea una nueva.</p>}

          {editing && (
            <>
              <div className="campo">
                <label>Número de fecha</label>
                <input
                  type="number"
                  min={1}
                  value={editing.numeroFecha}
                  onChange={(e) =>
                    updateField("numeroFecha", e.target.value)
                  }
                />
              </div>

              <div className="campo">
                <label>Título</label>
                <input
                  value={editing.titulo || ""}
                  onChange={(e) => updateField("titulo", e.target.value)}
                />
              </div>

              <div className="campo">
                <label>Fecha de jornada (cabecera)</label>
                <input
                  type="date"
                  value={editing.fechaCabecera || ""}
                  onChange={(e) =>
                    updateField("fechaCabecera", e.target.value)
                  }
                />
              </div>

              <hr style={{ margin: "16px 0" }} />

              <h4>Partidos</h4>
              <button
                type="button"
                className="btn-enviar"
                onClick={addPartido}
                style={{ marginBottom: 8 }}
              >
                ➕ Agregar partido
              </button>

              {(editing.partidos || []).length === 0 && (
                <p>No hay partidos aún.</p>
              )}

              {(editing.partidos || []).map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 8,
                    padding: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div className="campo" style={{ flex: "1 1 160px" }}>
                      <label>Equipo 1</label>
                      <select
                        value={p.equipo1 || ""}
                        onChange={(e) =>
                          updatePartidoField(idx, "equipo1", e.target.value)
                        }
                      >
                        <option value="">-- Selecciona --</option>
                        {equipos.map((eq) => (
                          <option key={eq._id} value={eq._id}>
                            {eq.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="campo" style={{ flex: "1 1 160px" }}>
                      <label>Equipo 2</label>
                      <select
                        value={p.equipo2 || ""}
                        onChange={(e) =>
                          updatePartidoField(idx, "equipo2", e.target.value)
                        }
                      >
                        <option value="">-- Selecciona --</option>
                        {equipos.map((eq) => (
                          <option key={eq._id} value={eq._id}>
                            {eq.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="campo" style={{ flex: "1 1 200px" }}>
                      <label>Fecha</label>
                      <input
                        type="date"
                        value={p.fechaPartido || ""}
                        onChange={(e) =>
                          updatePartidoField(
                            idx,
                            "fechaPartido",
                            e.target.value === "" ? null : e.target.value
                          )
                        }
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-cerrar"
                      onClick={() => removePartido(idx)}
                    >
                      Eliminar
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <div className="campo" style={{ flex: "1 1 200px" }}>
                      <label>Valores adicionales Eq.1 (separados por coma)</label>
                      <input
                        value={(p.valor_adicional_eq1 || []).join(", ")}
                        onChange={(e) =>
                          updatePartidoField(
                            idx,
                            "valor_adicional_eq1",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="campo" style={{ flex: "1 1 200px" }}>
                      <label>Valores adicionales Eq.2 (separados por coma)</label>
                      <input
                        value={(p.valor_adicional_eq2 || []).join(", ")}
                        onChange={(e) =>
                          updatePartidoField(
                            idx,
                            "valor_adicional_eq2",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button
                  className="btn-enviar"
                  onClick={guardar}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar fecha"}
                </button>
                {selectedId && (
                  <button
                    type="button"
                    className="btn-cerrar"
                    onClick={eliminarFecha}
                    disabled={saving}
                  >
                    Eliminar fecha
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <p>{modalMessage}</p>
              <button
                onClick={() => setShowModal(false)}
                className="btn-cerrar"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
