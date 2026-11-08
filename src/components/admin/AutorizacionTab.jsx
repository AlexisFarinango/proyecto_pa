import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import DocumentoAutorizacion, { datosEjemplo, revisarPlantilla } from "../autorizacion/DocumentoAutorizacion";

const CAMPOS = ["titulo", "destinatario", "cuerpo", "ciudad", "nota", "despedida"];
const soloCampos = (p) => Object.fromEntries(CAMPOS.map(c => [c, p?.[c] || ""]));
const difiere = (form, plantilla) => CAMPOS.some(c => (form?.[c] || "").trim() !== (plantilla?.[c] || ""));

// Borrador sin guardar: se conserva al cambiar de pestaña del admin o recargar la página
const BORRADOR_KEY = "autorizacionBorrador";
const leerBorrador = () => {
  try { return JSON.parse(sessionStorage.getItem(BORRADOR_KEY) || "null"); } catch { return null; }
};
const guardarBorrador = (b) => {
  try {
    if (b) sessionStorage.setItem(BORRADOR_KEY, JSON.stringify(b));
    else sessionStorage.removeItem(BORRADOR_KEY);
  } catch { /* sin almacenamiento */ }
};

export default function AutorizacionTab() {
  const nav = useNavigate();
  const [data, setData] = useState(null); // { plantilla, historial, predeterminada, placeholders }
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [resultado, setResultado] = useState("");
  const [pdf, setPdf] = useState(null); // { url, titulo }
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const cuerpoRef = useRef(null);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Basic ${sessionStorage.getItem("adminBasic") || ""}`,
  });

  const sesionExpirada = () => {
    setMsg("Sesión expirada. Inicia sesión otra vez");
    nav("/admin/login", { replace: true });
  };

  const load = async () => {
    setMsg("");
    setCargando(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/autorizacion/plantilla`, { headers: getHeaders() });
      if (resp.status === 401) return sesionExpirada();
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.message || "Error cargando el formato");
      setData(d);
      // Si quedó un borrador sin guardar sobre esta misma versión, se recupera
      const b = leerBorrador();
      if (b && b.version === d.plantilla.version && difiere(b.form, d.plantilla)) {
        setForm(soloCampos(b.form));
        setMsg("Se recuperaron cambios sin guardar. Recuerda presionar \"Guardar cambios\" para aplicarlos.");
      } else {
        guardarBorrador(null);
        setForm(soloCampos(d.plantilla));
      }
    } catch (e) {
      setMsg(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => () => { if (pdf?.url) URL.revokeObjectURL(pdf.url); }, [pdf]);

  const ejemplo = useMemo(() => datosEjemplo(data?.placeholders), [data]);
  const errores = useMemo(() => (form && data ? revisarPlantilla(form, data.placeholders) : []), [form, data]);
  const hayCambios = !!(form && data && difiere(form, data.plantilla));
  const vigente = data?.historial.find(h => h.activa);

  // Guarda el borrador y avisa al cerrar/recargar la página si hay cambios sin guardar
  useEffect(() => {
    if (!data || !form) return;
    guardarBorrador(hayCambios ? { version: data.plantilla.version, form } : null);
    if (!hayCambios) return;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [form, data, hayCambios]);

  const descartar = () => {
    guardarBorrador(null);
    setForm(soloCampos(data.plantilla));
    setMsg("");
  };

  const set = (campo) => (e) => setForm(f => ({ ...f, [campo]: e.target.value }));

  // Inserta {{CAMPO}} donde está el cursor dentro del cuerpo
  const insertar = (key) => {
    const ta = cuerpoRef.current;
    const token = `{{${key}}}`;
    if (!ta) return setForm(f => ({ ...f, cuerpo: f.cuerpo + token }));
    const ini = ta.selectionStart ?? form.cuerpo.length;
    const fin = ta.selectionEnd ?? ini;
    const nuevo = form.cuerpo.slice(0, ini) + token + form.cuerpo.slice(fin);
    setForm(f => ({ ...f, cuerpo: nuevo }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(ini + token.length, ini + token.length);
    });
  };

  const verPdf = async (plantilla, titulo) => {
    setMsg("");
    setGenerandoPdf(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/autorizacion/preview`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(plantilla),
      });
      if (resp.status === 401) return sesionExpirada();
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d.message || "No se pudo generar la vista previa");
      }
      const blob = await resp.blob();
      setPdf({ url: URL.createObjectURL(blob), titulo });
    } catch (e) {
      setMsg(e.message);
    } finally {
      setGenerandoPdf(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setMsg("");
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/autorizacion/plantilla`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (resp.status === 401) return sesionExpirada();
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.message || "Error guardando el formato");
      setConfirmar(false);
      guardarBorrador(null);
      setResultado(`✅ ${d.message}. Se aplicará a los próximos registros.`);
      await load();
    } catch (e) {
      setConfirmar(false);
      setMsg(e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando && !data) return <p>Cargando formato de autorización…</p>;
  if (!data || !form) return <p className="error">{msg || "No se pudo cargar el formato."}</p>;

  const totalFirmadas = data.historial.reduce((a, h) => a + h.firmadas, 0);

  return (
    <div className="aut-admin">
      <h3 className="form-titulo" style={{ fontSize: "1.5rem" }}>📝 Formato de autorización para menores</h3>
      <p className="aut-admin__info">
        Formato vigente: <b>versión {data.plantilla.version}</b>
        {vigente?.createdAt && <> · actualizado el {dayjs(vigente.createdAt).format("DD/MM/YYYY HH:mm")}</>}
        <br />
        Los cambios solo se aplican a los <b>registros futuros</b>; las autorizaciones ya firmadas no se modifican.
      </p>

      {/* Barra fija: los cambios NO se aplican al formulario de registro hasta guardarlos */}
      {hayCambios && (
        <div className="aut-admin__barra" role="status">
          <span>
            ⚠️ <b>Cambios sin guardar.</b> El formulario de registro seguirá usando la versión {data.plantilla.version} hasta que los guardes.
          </span>
          <div className="aut-admin__barra-acciones">
            <button
              className="btn-enviar"
              onClick={() => setConfirmar(true)}
              disabled={errores.length > 0 || guardando}
              title={errores.length ? "Corrige los errores del formato antes de guardar" : ""}
            >
              💾 Guardar cambios
            </button>
            <button className="btn-cerrar" style={{ marginTop: 0 }} onClick={descartar} disabled={guardando}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {msg && <p className="error">{msg}</p>}

      <div className="aut-admin__grid">
        {/* ---- Editor ---- */}
        <div className="aut-admin__editor">
          <div className="campo">
            <label>Título (opcional)</label>
            <input value={form.titulo} onChange={set("titulo")} maxLength={150} />
          </div>
          <div className="campo">
            <label>Destinatario (una línea por renglón, en negrita)</label>
            <textarea rows={4} value={form.destinatario} onChange={set("destinatario")} maxLength={400} />
          </div>
          <div className="campo">
            <label>Cuerpo de la autorización (deja una línea en blanco para separar párrafos)</label>
            <div className="chips">
              {data.placeholders.map(p => (
                <button
                  key={p.key}
                  type="button"
                  className={`chip ${form.cuerpo.includes(`{{${p.key}}}`) ? "chip--usado" : ""}`}
                  title={`Insertar: ${p.label}${p.obligatorio ? " (obligatorio)" : ""}`}
                  onClick={() => insertar(p.key)}
                >
                  {p.label}{p.obligatorio ? " *" : ""}
                </button>
              ))}
            </div>
            <textarea ref={cuerpoRef} rows={14} value={form.cuerpo} onChange={set("cuerpo")} maxLength={4000} />
            <small className="aut-admin__ayuda">
              Toca un botón para insertar un dato en la posición del cursor. Los marcados con * son obligatorios.
              En el documento final se reemplazan por los datos reales en negrita.
            </small>
          </div>
          <div className="campo">
            <label>Ciudad (la fecha se agrega automáticamente)</label>
            <input value={form.ciudad} onChange={set("ciudad")} maxLength={60} />
          </div>
          <div className="campo">
            <label>Nota (opcional, en negrita)</label>
            <input value={form.nota} onChange={set("nota")} maxLength={300} />
          </div>
          <div className="campo">
            <label>Despedida (opcional)</label>
            <input value={form.despedida} onChange={set("despedida")} maxLength={100} />
          </div>

          {errores.length > 0 && (
            <ul className="aut-admin__errores">
              {errores.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}

          <div className="btn-group" style={{ marginTop: 12 }}>
            <button
              className="btn-enviar"
              onClick={() => setConfirmar(true)}
              disabled={!hayCambios || errores.length > 0 || guardando}
            >
              💾 Guardar cambios
            </button>
            <button
              className="btn-cerrar"
              style={{ marginTop: 0 }}
              onClick={() => verPdf({ ...form, version: data.plantilla.version + (hayCambios ? 1 : 0) }, "Vista previa del formato en edición")}
              disabled={errores.length > 0 || generandoPdf}
            >
              {generandoPdf ? "Generando…" : "👁️ Vista previa PDF"}
            </button>
            {hayCambios && (
              <button className="btn-cerrar" style={{ marginTop: 0 }} onClick={descartar}>
                Descartar cambios
              </button>
            )}
            <button
              className="btn-cerrar"
              style={{ marginTop: 0 }}
              onClick={() => setForm(soloCampos(data.predeterminada))}
              title="Carga el formato original en el editor (no se guarda hasta presionar Guardar)"
            >
              Restaurar formato original
            </button>
          </div>
        </div>

        {/* ---- Vista previa en vivo ---- */}
        <div className="aut-admin__preview">
          <p className="aut-admin__preview-titulo">
            Vista previa con datos de ejemplo {hayCambios && <span className="badge">cambios sin guardar</span>}
          </p>
          <DocumentoAutorizacion plantilla={form} datos={ejemplo} firmaEjemplo />
        </div>
      </div>

      {/* ---- Historial ---- */}
      <h4 style={{ marginTop: 24 }}>Historial de versiones</h4>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Versión</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Autorizaciones firmadas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.historial.map(h => (
              <tr key={h.version}>
                <td>v{h.version}</td>
                <td>{h.createdAt ? dayjs(h.createdAt).format("DD/MM/YYYY HH:mm") : "-"}</td>
                <td>{h.activa ? <b>Vigente</b> : "Anterior"}</td>
                <td>{h.firmadas}</td>
                <td className="actions">
                  <button onClick={() => verPdf(h, `Formato versión ${h.version}`)} disabled={generandoPdf}>👁️ Ver</button>{" "}
                  {!h.activa && (
                    <button onClick={() => setForm(soloCampos(h))} title="Cargar este texto en el editor">
                      ↩️ Usar en editor
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Modal de confirmación ---- */}
      {confirmar && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content">
            <h3 style={{ marginTop: 0 }}>⚠️ Confirmar cambio de formato</h3>
            <p>
              Se creará la <b>versión {data.plantilla.version + 1}</b> del formato de autorización.
            </p>
            <ul>
              <li>El nuevo formato se aplicará <b>solo a los registros futuros</b> de jugadores de 14 a 17 años.</li>
              <li>
                Las <b>{totalFirmadas}</b> autorizaciones ya firmadas <b>NO se modificarán</b>: cada una conserva el
                formato con el que fue firmada.
              </li>
              <li>Las versiones anteriores quedan guardadas en el historial.</li>
            </ul>
            <div className="modal-actions">
              <button className="btn-enviar" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando…" : "Sí, guardar cambios"}
              </button>
              <button className="btn-cerrar" style={{ marginTop: 0 }} onClick={() => setConfirmar(false)} disabled={guardando}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Resultado ---- */}
      {resultado && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content modal-content--sm">
            <p>{resultado}</p>
            <button className="btn-cerrar" onClick={() => setResultado("")}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ---- Visor PDF ---- */}
      {pdf && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content modal-pdf">
            <h4 style={{ marginTop: 0 }}>{pdf.titulo}</h4>
            <iframe src={pdf.url} title={pdf.titulo} className="pdf-frame" />
            <div className="modal-actions">
              <a className="btn-enviar" href={pdf.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                Abrir en pestaña nueva
              </a>
              <button className="btn-cerrar" style={{ marginTop: 0 }} onClick={() => setPdf(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
