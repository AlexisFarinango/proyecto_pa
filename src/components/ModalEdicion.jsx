import React, { useState } from "react";
import dayjs from "dayjs";

const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const identRegex = /^[A-Za-z0-9\-]+$/;

function ErrorModal({ open, message, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" aria-modal="true" role="dialog">
      <div className="modal-content modal-error">
        <h4 style={{ marginTop: 0 }}>⚠️ Ocurrió un problema</h4>
        <p style={{ margin: "6px 0 16px" }}>{message}</p>
        <button className="btn-enviar" onClick={onClose}>Entendido</button>
      </div>
    </div>
  );
}

export default function ModalEdicion({ jugador, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: jugador.firstName,
    lastName: jugador.lastName,
    dob: dayjs(jugador.dob).format("YYYY-MM-DD"),
    identificacion: jugador.identificacion,
    numjugador: jugador.numjugador
  });

  const [idImage, setIdImage] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  const [selfieImage, setSelfie] = useState(null);
  const [autorizacion, setAutorizacion] = useState(null);

  const [preview, setPreview] = useState({
    idImageUrl: jugador.idImageUrl,
    idBackImageUrl: jugador.idBackImageUrl,
    selfieImageUrl: jugador.selfieImageUrl,
    autorizacionUrl: jugador.autorizacionUrl || null
  });

  const [loading, setLoading] = useState(false);

  // estado del modal de error
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const showError = (msg) => {
    setErrorMsg(msg || "Ha ocurrido un error.");
    setErrorOpen(true);
  };

  const onChangeFile = (setter, keyPreview) => e => {
    const f = e.target.files[0];
    setter(f);
    if (f && f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(p => ({ ...p, [keyPreview]: url }));
    } else if (f) {
      setPreview(p => ({ ...p, [keyPreview]: "PDF adjunto" }));
    }
  };

  const guardar = async () => {
    // validaciones mínimas
    if (!nameRegex.test(form.firstName)) return showError("Nombres inválidos");
    if (!nameRegex.test(form.lastName)) return showError("Apellidos inválidos");
    if (!form.dob) return showError("Fecha requerida");
    if (!identRegex.test(form.identificacion)) return showError("Identificación inválida");
    if (!form.numjugador || isNaN(form.numjugador) || form.numjugador < 1 || form.numjugador > 99) {
      return showError("Número inválido (1-99)");
    }

    // si cambió la fecha, calcula edad
    const dobChanged = form.dob !== dayjs(jugador.dob).format("YYYY-MM-DD");
    if (dobChanged) {
      const parsed = dayjs(form.dob, "YYYY-MM-DD", true);
      if (!parsed.isValid()) return showError("Fecha inválida");
      const newAge = dayjs().diff(parsed, "year");

      if (newAge < 14) return showError("No se permiten menores de 14 años");

      // Si 14–17, exigir autorización si no hay en BD ni se cargó nueva
      const requiereAut = newAge >= 14 && newAge < 18;
      if (requiereAut) {
        const yaTieneAut = !!jugador.autorizacionUrl;
        const cargoNuevaAut = !!autorizacion;
        if (!yaTieneAut && !cargoNuevaAut) {
          return showError("Autorización requerida (14-17 años)");
        }
      }
    }

    const fd = new FormData();
    // solo campos cambiados
    if (form.firstName !== jugador.firstName) fd.append("firstName", form.firstName);
    if (form.lastName !== jugador.lastName) fd.append("lastName", form.lastName);
    if (form.dob !== dayjs(jugador.dob).format("YYYY-MM-DD")) fd.append("dob", form.dob);
    if (String(form.numjugador) !== String(jugador.numjugador)) fd.append("numjugador", form.numjugador);
    if (form.identificacion !== jugador.identificacion) fd.append("identificacion", form.identificacion);
    if (idImage) fd.append("idImage", idImage);
    if (idBackImage) fd.append("idBackImage", idBackImage);
    if (selfieImage) fd.append("selfieImage", selfieImage);
    if (autorizacion) fd.append("autorizacion", autorizacion);

    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/jugadores/${jugador._id}`, {
        method: "PUT",
        body: fd
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Error guardando");
      onSaved(data.jugador);
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content modal-edit">
          <h3 style={{ marginTop: 0 }}>Editar jugador</h3>

          {/* Formulario */}
          <div className="campo">
            <label>Nombres</label>
            <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
          </div>
          <div className="campo">
            <label>Apellidos</label>
            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <div className="campo">
            <label>Fecha nacimiento</label>
            <input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          </div>
          <div className="campo">
            <label>Identificación</label>
            <input
              value={form.identificacion}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  identificacion: e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, "")
                }))
              }
            />
          </div>
          <div className="campo">
            <label>Número (1-99)</label>
            <input type="number" value={form.numjugador} onChange={e => setForm(f => ({ ...f, numjugador: e.target.value }))} />
          </div>

          <div className="grid-2 modal-grid">
            <div>
              <label>Frontal</label>
              <div className="img-box">
                {preview.idImageUrl?.startsWith("http") || preview.idImageUrl?.startsWith("blob:")
                  ? <img src={preview.idImageUrl} alt="frontal" />
                  : <span>{preview.idImageUrl || "Sin vista"}</span>}
              </div>
              <input type="file" onChange={onChangeFile(setIdImage, "idImageUrl")} />
            </div>

            <div>
              <label>Trasera</label>
              <div className="img-box">
                {preview.idBackImageUrl?.startsWith("http") || preview.idBackImageUrl?.startsWith("blob:")
                  ? <img src={preview.idBackImageUrl} alt="trasera" />
                  : <span>{preview.idBackImageUrl || "Sin vista"}</span>}
              </div>
              <input type="file" onChange={onChangeFile(setIdBackImage, "idBackImageUrl")} />
            </div>

            <div>
              <label>Selfie</label>
              <div className="img-box">
                {preview.selfieImageUrl?.startsWith("http") || preview.selfieImageUrl?.startsWith("blob:")
                  ? <img src={preview.selfieImageUrl} alt="selfie" />
                  : <span>{preview.selfieImageUrl || "Sin vista"}</span>}
              </div>
              <input type="file" onChange={onChangeFile(setSelfie, "selfieImageUrl")} />
            </div>

            <div>
              <label>Autorización (img o PDF)</label>
              <div className="img-box">
                {preview.autorizacionUrl
                  ? (typeof preview.autorizacionUrl === "string" && preview.autorizacionUrl.startsWith("http"))
                      ? <a href={preview.autorizacionUrl} target="_blank" rel="noreferrer">Ver archivo actual</a>
                      : <span>{preview.autorizacionUrl}</span>
                  : <span>Sin archivo</span>}
              </div>
              <input type="file" onChange={onChangeFile(setAutorizacion, "autorizacionUrl")} />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-enviar" onClick={guardar} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button className="btn-cerrar" onClick={onClose} disabled={loading}>Cancelar</button>
          </div>
        </div>
      </div>

      {/* Modal de error */}
      <ErrorModal open={errorOpen} message={errorMsg} onClose={() => setErrorOpen(false)} />
    </>
  );
}
