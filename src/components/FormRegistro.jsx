import React, { useState } from 'react';
import dayjs from 'dayjs';
import AutorizacionDigital, {
  autorizacionVacia,
  validarAutorizacion,
  agregarAutorizacionAFormData,
} from './autorizacion/AutorizacionDigital';
import { ACCEPT_IMAGEN_PDF, normalizarImagenOPdf } from '../utils/archivos';
import { useServicio, asegurarServicio, servicioCaido } from '../utils/servicio';
const registroAbierto = Number(import.meta.env.VITE_REGISTRO_ABIERTO) === 1;

const identRegex = /^[A-Za-z0-9\-]+$/;
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

export default function FormRegistro() {
  const [form, setForm] = useState({
    codDirigente: '',
    firstName: '',
    lastName: '',
    dob: '',
    identificacion: '',
    numjugador: '',
    team: ''
  });
  const [validCode, setValidCode] = useState(false);
  const [age, setAge] = useState(null);
  const [ageDisplay, setAgeDisplay] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [idBackImage, setBackImage] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [autorizacion, setAutorizacion] = useState(autorizacionVacia);
  // Cambia al limpiar el formulario para reiniciar la sección de firma
  const [autKey, setAutKey] = useState(0);
  // Cambio de equipo: ¿jugó en otro club de la liga el campeonato anterior? ('SI' | 'NO')
  const [jugoOtroEquipo, setJugoOtroEquipo] = useState('');
  const [clubAnterior, setClubAnterior] = useState('');
  const [paseFile, setPaseFile] = useState(null);
  // Declaración final obligatoria
  const [declaracion, setDeclaracion] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingTexto, setLoadingTexto] = useState('Registrando jugador...');
  // Backend listo (Render gratuito puede estar encendiéndose)
  const servicio = useServicio();
  const [modalMessage, setModalMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  const showMsg = (text) => {
    setModalMessage(text);
    setShowModal(true);
  };
  const handleDob = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, dob: val }));
    if (val) {
      const years = dayjs().diff(dayjs(val), 'year');
      setAge(years);
      setAgeDisplay(`${years} AÑOS`);
    } else {
      setAge(null);
      setAgeDisplay('');
    }
  };
  // Helper genérico para validar imágenes
  const handleImageOnly = (e, setFile, label = 'Archivo') => {
    const file = e.target.files?.[0];
    if (!file) { setFile(null); return; }

    // Solo imágenes
    if (!file.type || !file.type.startsWith('image/')) {
      setFile(null);
      e.target.value = '';
      showMsg(`❌ ${label}: solo se permiten imágenes (JPG, PNG, etc.).`);
      return;
    }

    // Máx 10MB
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFile(null);
      e.target.value = '';
      showMsg(`❌ ${label}: tamaño máximo 10MB.`);
      return;
    }

    setFile(file);
  };


  const validateCode = async (code) => {
    setForm(f => ({ ...f, codDirigente: code }));
    if (code.trim() === '') {
      setValidCode(false);
      setForm(f => ({ ...f, team: '' }));
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/equipos/validate/${encodeURIComponent(code)}`);
      if (resp.ok) {
        const data = await resp.json(); // { nombre, codigo, dirigenteId }
        setValidCode(true);
        setForm(f => ({ ...f, team: data.nombre }));
      } else {
        setValidCode(false);
        setForm(f => ({ ...f, team: '' }));
      }
    } catch (error) {
      setValidCode(false);
      setForm(f => ({ ...f, team: '' }));
    }
  };

  const resetForm = () => {
    setForm({
      codDirigente: '',
      firstName: '',
      lastName: '',
      dob: '',
      identificacion: '',
      numjugador: '',
      team: ''
    });
    setIdFile(null);
    setBackImage(null);
    setSelfieFile(null);
    setAutorizacion(autorizacionVacia());
    setAutKey(k => k + 1);
    setJugoOtroEquipo('');
    setClubAnterior('');
    setPaseFile(null);
    setDeclaracion(false);
    setAge(null);
    setAgeDisplay('');
    setValidCode(false);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
  };

  const submit = async (e) => {
    e.preventDefault();
    form.firstName = form.firstName.trim().replace(/\s+/g, ' ');
    form.lastName = form.lastName.trim().replace(/\s+/g, ' ');

    // Validaciones front (las tuyas + autorización condicional)
    if (!validCode)        return showMsg('❌ Código de dirigente inválido');
    if (!nameRegex.test(form.firstName)) return showMsg('❌ Nombres inválidos');
    if (!nameRegex.test(form.lastName))  return showMsg('❌ Apellidos inválidos');
    if (!form.dob)         return showMsg('❌ Fecha requerida');

    const years = age ?? dayjs().diff(dayjs(form.dob), 'year');
    if (years < 14)        return showMsg('❌ No se permiten registros menores de 14 años');

    if (!identRegex.test(form.identificacion))
      return showMsg('❌ Identificación inválida (use letras, números o guiones)');

    if (!form.numjugador || isNaN(form.numjugador) || form.numjugador < 1 || form.numjugador > 99)
      return showMsg('❌ Número inválido (1-99)');

    if (!jugoOtroEquipo)
      return showMsg('❌ Indique si participó en otro club de la liga en el campeonato anterior');
    if (jugoOtroEquipo === 'SI' && clubAnterior.trim().length < 2)
      return showMsg('❌ Ingrese el nombre del club deportivo al que perteneció previamente');
    if (jugoOtroEquipo === 'SI' && !paseFile)
      return showMsg('❌ Adjunte el PASE realizado por el dirigente del club deportivo previo');

    const requiereAut = years >= 14 && years < 18;
    if (requiereAut) {
      const errAut = validarAutorizacion(autorizacion, form.identificacion);
      if (errAut) return showMsg(`❌ ${errAut}`);
    }

    if (!declaracion)
      return showMsg('❌ Debe aceptar la declaración de veracidad de la información');

    // ---- Confirmar que el servicio sigue encendido justo antes de enviar
    setLoadingTexto('Conectando con el servicio...');
    setLoading(true);
    const servicioOk = await asegurarServicio();
    if (!servicioOk) {
      setLoading(false);
      return showMsg('⏳ El servicio aún está cargando. Espera a que desaparezca el aviso sobre el botón y vuelve a presionar "Registrar Jugador". Tus datos no se han perdido.');
    }

    // ---- Envío
    setLoadingTexto('Registrando jugador...');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('idImage', idFile);
    fd.append('idBackImage', idBackImage);
    fd.append('selfieImage', selfieFile);
    fd.append('jugoOtroEquipo', jugoOtroEquipo);
    if (jugoOtroEquipo === 'SI') {
      fd.append('clubAnterior', clubAnterior.trim());
      fd.append('paseFile', paseFile);
    }
    fd.append('declaracionVeracidad', declaracion ? 'true' : 'false');
    if (requiereAut) agregarAutorizacionAFormData(fd, autorizacion);

    // timeout para fetch (20s; 60s si hay autorización o pase porque se suben más archivos)
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), requiereAut || jugoOtroEquipo === 'SI' ? 60000 : 20000);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users`,
        { method: 'POST', body: fd, signal: controller.signal }
      );
      clearTimeout(timeoutId);

      // intentamos leer json; si no hay, data = null
      let data = null;
      try { data = await resp.json(); } catch { /* noop */ }

      if (resp.ok) {
        showMsg('✅ Registrado correctamente');
        resetForm();
        return;
      }

      // ----- Mapeo de códigos de error
      let message = '';
      switch (resp.status) {
        case 400:
          // errores de validación desde tu backend
          message = data?.message ||
                    'Datos inválidos. Revisa nombres, identificación, fecha y números.';
          break;
        case 401:
          message = data?.message || 'No autorizado.';
          break;
        case 404:
          message = data?.message || 'Código de equipo no encontrado.';
          break;
        case 409:
          // conflictos típicos: identificación duplicada o número repetido
          // tu backend ya envía mensajes útiles, los mostramos:
          message = data?.message ||
                    'Ya existe un registro con estos datos (identificación o número).';
          break;
        case 413:
          message = 'Archivo demasiado grande. Máximo 10MB por archivo.';
          break;
        case 415:
          message = 'Formato de archivo no permitido. Usa solo imágenes (JPG, PNG, etc.).';
          break;
        case 500:
          message = data?.detail || data?.message || 'Error interno del servidor.';
          break;
        default:
          message = data?.message || `Error inesperado (${resp.status}).`;
          break;
      }

      showMsg(`❌ ${message}`);
    } catch (err) {
      clearTimeout(timeoutId);
      // Errores de red / CORS / timeout
      if (err.name === 'AbortError') {
        showMsg('⏱️ Tiempo de espera agotado. Inténtalo nuevamente.');
      } else {
        // Falla de red ("Failed to fetch" en Chrome/Android, "Load failed" en Safari/iPhone,
        // "NetworkError" en Firefox): normalmente el servidor se estaba reiniciando.
        // Se vuelve a esperar al servicio sin borrar el formulario.
        servicioCaido();
        showMsg('⏳ El servicio se estaba reiniciando. Espera un momento a que termine de cargar (verás el aviso sobre el botón) y vuelve a presionar "Registrar Jugador". Tus datos no se han perdido.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
     {registroAbierto ? (
        <>
          {/* Loader */}
          {loading && (
            <div className="overlay-loader">
              <div className="ball-loader"></div>
              <p>{loadingTexto}</p>
            </div>
          )}

          <form onSubmit={submit} className="form-futbol">
            <div className="brand-header">
              <img src="/logo-liga.png" alt="Liga Deportiva Bienestar Familiar de Calderón" className="brand-badge" />
              <h1 className="brand-title">Liga Deportiva Bienestar Familiar de Calderón</h1>
              <p className="brand-subtitle">Acuerdo ministerial N. 0184 – 15 agosto 2023</p>
              <p className="brand-subtitle brand-subtitle--thin">Nómina de jugadores – 7º campeonato de indorfútbol masculino</p>
            </div>


            {/* Código Dirigente */}
            <div className="campo">
              <label>Código de Dirigente</label>
              <input
                required
                value={form.codDirigente}
                placeholder="Código de dirigente"
                onChange={e => {
                  // Eliminar espacios (al escribir y pegar)
                  let val = e.target.value.replace(/\s+/g, "");
                  validateCode(val);
                }}
                disabled={loading}
              />
              {!validCode && form.codDirigente && <p className="error">Código inválido</p>}
            </div>

            <div className="campo">
              <label>Equipo de fútbol</label>
              <input readOnly value={form.team} placeholder="Ingrese código de dirigente" className="readonly" />
            </div>

            <div className="campo">
              <label>Nombres</label>
              <input
                required
                value={form.firstName}
                placeholder="Nombres Jugador"
                maxLength={100} // máximo 100 caracteres
                onChange={e => { let val = e.target.value; 
                  // Solo letras y espacios 
                  val = val.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''); 
                  // Quitar espacios al inicio/final 
                  val = val.trimStart(); 
                  // Reemplazar múltiples espacios por uno 
                  val = val.replace(/\s+/g, ' '); 
                  // Convertir a mayúsculas 
                  val = val.toUpperCase(); 
                  setForm(f => ({ ...f, firstName: val })); }}
                disabled={loading}
              />
            </div>

            <div className="campo">
              <label>Apellidos</label>
              <input
                required
                value={form.lastName}
                placeholder="Apellidos Jugador"
                maxLength={100} // máximo 100 caracteres
                onChange={e => { let val = e.target.value; 
                  // Solo letras y espacios 
                  val = val.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''); 
                  // Quitar espacios al inicio/final 
                  val = val.trimStart(); 
                  // Reemplazar múltiples espacios por uno 
                  val = val.replace(/\s+/g, ' '); 
                  // Convertir a mayúsculas 
                  val = val.toUpperCase(); 
                  setForm(f => ({ ...f, lastName: val })); }}
                disabled={loading}
              />
            </div>

            <div className="campo">
              <label>Fecha nacimiento</label>
              <input type="date" required value={form.dob} onChange={handleDob} disabled={loading}/>
            </div>

            <div className="campo">
              <label>Edad</label>
              <input readOnly value={ageDisplay} className="readonly" />
            </div>

            <div className="campo">
              <label>Identificación (cédula/pasaporte)</label>
              <input
                required
                placeholder="Identificación Jugador"
                value={form.identificacion}
                maxLength={20}
                onChange={e => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
                  setForm(f => ({ ...f, identificacion: val }));
                }}
                disabled={loading}
              />
            </div>

            <div className="campo">
              <label>Número de jugador (1-99)</label>
              <input
                type="number"
                required
                value={form.numjugador}
                placeholder="Número Jugador"
                min={1}
                max={99}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, ''); // solo números
                  if (val.length > 2) val = val.slice(0, 2); // máximo 2 dígitos
                  if (val === '0') val = ''; // no permitir 0
                  setForm(f => ({ ...f, numjugador: val }));
                }}
                disabled={loading}
              />
            </div>

            <p style={{ fontSize: 20, marginTop: 15 }}>
              Nota: si el documento de identificación es <b>pasaporte</b>, sube la misma Imagen/Foto del Pasaporte en “Cédula frontal” y “Cédula trasera”.
            </p>

            {/* Cédula/Pasaporte - Parte Frontal */}
            <div className="campo">
              <label>Cédula/Pasaporte - Parte Fronta (IMAGEN/FOTO)</label>
              <input
                type="file"
                required
                accept="image/*"
                // capture="environment" // opcional: abre cámara trasera en móviles
                onChange={e => handleImageOnly(e, setIdFile, 'Cédula frontal')}
                disabled={loading}
              />
            </div>

            {/* Foto Cédula/Pasaporte - Parte Trasera */}
            <div className="campo">
              <label>Foto Cédula/Pasaporte - Parte Trasera (IMAGEN/FOTO)</label>
              <input
                type="file"
                required
                accept="image/*"
                // capture="environment"
                onChange={e => handleImageOnly(e, setBackImage, 'Cédula trasera')}
                disabled={loading}
              />
            </div>

            {/* Selfie Jugador */}
            <div className="campo">
              <label>Selfie Jugador (IMAGEN/FOTO)</label>
              <input
                type="file"
                required
                accept="image/*"
                // capture="user" // opcional: cámara frontal
                onChange={e => handleImageOnly(e, setSelfieFile, 'Selfie')}
                disabled={loading}
              />
            </div>

            {/* Cambio de equipo: PASE del club anterior */}
            <div className="campo">
              <label>
                ¿Participaste para un club deportivo de la Liga Bienestar Familiar diferente en el campeonato anterior?
              </label>
              <div className="radio-row" role="radiogroup">
                {[['SI', 'SÍ'], ['NO', 'NO']].map(([val, texto]) => (
                  <label key={val} className={`radio-opcion ${jugoOtroEquipo === val ? 'radio-opcion--activa' : ''}`}>
                    <input
                      type="radio"
                      name="jugoOtroEquipo"
                      value={val}
                      required
                      checked={jugoOtroEquipo === val}
                      disabled={loading}
                      onChange={() => {
                        setJugoOtroEquipo(val);
                        if (val === 'NO') {
                          setClubAnterior('');
                          setPaseFile(null);
                        }
                      }}
                    />
                    {texto}
                  </label>
                ))}
              </div>
            </div>

            {jugoOtroEquipo === 'SI' && (
              <div className="campo">
                <label>Nombre del club deportivo al que perteneciste previamente en la Liga Bienestar Familiar</label>
                <input
                  required
                  value={clubAnterior}
                  placeholder="Nombre del club deportivo anterior"
                  maxLength={100}
                  disabled={loading}
                  onChange={e => setClubAnterior(e.target.value.replace(/^\s+/, '').replace(/\s+/g, ' ').toUpperCase())}
                />
              </div>
            )}

            {jugoOtroEquipo === 'SI' && (
              <div className="campo">
                <label>Por favor adjunta el PASE realizado por el Dirigente del Club Deportivo Previo (IMAGEN/FOTO o PDF)</label>
                <input
                  type="file"
                  required
                  accept={ACCEPT_IMAGEN_PDF}
                  disabled={loading}
                  onChange={async (e) => {
                    const input = e.target;
                    const file = input.files?.[0];
                    if (!file) { setPaseFile(null); return; }
                    const r = await normalizarImagenOPdf(file);
                    if (r.error) {
                      input.value = '';
                      setPaseFile(null);
                      showMsg(`❌ PASE: ${r.error}`);
                      return;
                    }
                    setPaseFile(r.file);
                  }}
                />
                <small className="aut-seccion__nota">
                  Puedes subir una foto o un PDF desde tu celular (iPhone o Android) o computador.
                </small>
              </div>
            )}

            {/* Autorización digital condicional (14 a 17 años) */}
            {(age !== null && age >= 14 && age < 18) && (
              <AutorizacionDigital
                key={autKey}
                jugador={{
                  nombre: `${form.firstName} ${form.lastName}`,
                  identificacion: form.identificacion,
                  edad: age,
                  equipo: form.team,
                }}
                value={autorizacion}
                onChange={setAutorizacion}
                onError={showMsg}
                disabled={loading}
              />
            )}
            

            {/* Declaración final obligatoria */}
            <label className="check-row declaracion-final">
              <input
                type="checkbox"
                required
                checked={declaracion}
                disabled={loading}
                onChange={e => setDeclaracion(e.target.checked)}
              />
              <span>
                Declaro que toda la información proporcionada en el presente formulario es verídica, completa y
                corresponde al jugador inscrito, y que los documentos adjuntos son auténticos. Acepto que cualquier
                falsedad en los datos o documentos podrá ocasionar la anulación de la inscripción y las sanciones que
                establezca el reglamento de la Liga Bienestar Familiar.
              </span>
            </label>

            {/* Aviso mientras el servicio (backend) se enciende: el botón sigue visible pero espera */}
            {!servicio.listo && (
              <div
                className={`aviso-servicio ${servicio.estado === 'error' ? 'aviso-servicio--error' : ''}`}
                role="status"
                aria-live="polite"
              >
                {servicio.estado === 'error' ? (
                  <>
                    <span>⚠️ No pudimos conectar con el servicio. Revisa tu conexión a internet e inténtalo de nuevo.</span>
                    <button type="button" className="btn-cerrar" style={{ marginTop: 0 }} onClick={() => servicio.reintentar()}>
                      Reintentar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span>
                      <b>Espera un momento mientras cargamos el servicio…</b><br />
                      Puedes seguir llenando el formulario; el botón se activará automáticamente.
                    </span>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`btn-enviar ${!servicio.listo ? 'btn-enviar--esperando' : ''}`}
              disabled={loading || !servicio.listo}
            >
              {servicio.listo ? 'Registrar Jugador 🏅' : '⏳ Cargando servicio…'}
            </button>

          </form>

          {/* Modal respuesta */}
          {showModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <p>{modalMessage}</p>
                <button onClick={() => setShowModal(false)} className="btn-cerrar">Cerrar</button>
              </div>
            </div>
          )}
        </>
      ):(
        <div
          className="form-futbol"
          style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}
        >
          <div className="brand-header" style={{ marginBottom: 16 }}>
            <img
              src="/logo-liga.png"
              alt="Liga Deportiva Bienestar Familiar de Calderón"
              className="brand-badge"
              style={{ width: 96, height: 96, objectFit: 'contain' }}
            />
            <h1 className="brand-title">Liga Deportiva Bienestar Familiar de Calderón</h1>
            <p className="brand-subtitle">
              Nómina de jugadores – 7º campeonato de indorfútbol masculino
            </p>
          </div>

          <img
            src="/registro-cerrado.png"
            alt="Registro cerrado"
            style={{
              display: 'block',
              margin: '0 auto',
              width: '100%',
              maxWidth: 520,
              borderRadius: 12,
              boxShadow: '0 6px 20px rgba(0,0,0,.15)',
            }}
            loading="lazy"
          />

          <h2 style={{ marginTop: 18 }}>Registro de jugadores cerrado</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, marginTop: 8 }}>
            El límite de fecha de registro de jugadores ha finalizado; el administrador notificará las nuevas
            fechas para registros.
          </p>
        </div>
      )}
    </>
  );
}
