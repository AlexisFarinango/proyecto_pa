import React, { useEffect, useMemo, useState } from 'react';
import FirmaPad from './FirmaPad';
import DocumentoAutorizacion, { fechaLarga } from './DocumentoAutorizacion';
import { ACCEPT_IMAGEN_PDF, normalizarImagenOPdf } from '../../utils/archivos';

const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;
const identRegex = /^[A-Za-z0-9\-]+$/;
const telRegex = /^\+?[0-9]{7,15}$/;
const MAX_BYTES = 10 * 1024 * 1024;

export const autorizacionVacia = () => ({
  nombre: '',
  cedula: '',
  parentesco: '',
  telefono: '',
  seguro: '',       // 'SI' | 'NO'
  aseguradora: '',  // obligatorio solo si seguro = 'SI'
  firma: null,
  cedulaFile: null,
  fotoFile: null,
  acepta: false,
  plantillaVersion: null,
});

// Devuelve el mensaje de error o null si todo está completo
export function validarAutorizacion(v, identificacionJugador = '') {
  const nombre = v.nombre.trim();
  if (!nombre || nombre.length < 5 || !nameRegex.test(nombre))
    return 'Ingrese los nombres y apellidos completos del representante';
  if (!v.cedula || v.cedula.length < 5 || !identRegex.test(v.cedula))
    return 'Ingrese una cédula válida del representante';
  if (identificacionJugador && v.cedula.toUpperCase() === String(identificacionJugador).toUpperCase())
    return 'La cédula del representante no puede ser la misma del jugador';
  if (!v.parentesco) return 'Seleccione el parentesco del representante';
  if (!telRegex.test(v.telefono)) return 'Ingrese un teléfono válido del representante (7 a 15 dígitos)';
  if (!v.seguro) return 'Indique si el menor cuenta con seguro médico (SÍ / NO)';
  if (v.seguro === 'SI' && v.aseguradora.trim().length < 2)
    return 'Ingrese el nombre de la aseguradora / cobertura del menor';
  if (!v.cedulaFile) return 'Adjunte la cédula del representante (imagen o PDF)';
  if (!v.fotoFile) return 'Adjunte la foto del representante sosteniendo su cédula';
  if (!v.firma) return 'El representante debe firmar la autorización';
  if (!v.acepta) return 'El representante debe aceptar los términos de la autorización';
  if (!v.plantillaVersion) return 'No se pudo cargar el formato de autorización. Recargue la página.';
  return null;
}

export function agregarAutorizacionAFormData(fd, v) {
  fd.append('representanteNombre', v.nombre.trim());
  fd.append('representanteCedula', v.cedula);
  fd.append('representanteParentesco', v.parentesco);
  fd.append('representanteTelefono', v.telefono);
  fd.append('seguroMedico', v.seguro);
  fd.append('aseguradora', v.seguro === 'SI' ? v.aseguradora.trim() : '');
  fd.append('aceptaAutorizacion', v.acepta ? 'true' : 'false');
  fd.append('plantillaVersion', String(v.plantillaVersion));
  fd.append('firmaRepresentante', v.firma, 'firma.png');
  fd.append('representanteCedulaImage', v.cedulaFile);
  fd.append('representanteFotoImage', v.fotoFile);
}

/**
 * Sección de autorización digital del representante (jugadores de 14 a 17 años).
 * jugador: { nombre, identificacion, edad, equipo }
 * value / onChange: estado y setState (useState) del componente padre
 */
export default function AutorizacionDigital({ jugador, value, onChange, onError, disabled = false }) {
  const [formato, setFormato] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [firmaUrl, setFirmaUrl] = useState(null);

  // onChange es el setState del padre: se usa la forma funcional porque la firma
  // y el formato llegan de forma asíncrona y no deben pisar lo que se escribió
  const set = (patch) => onChange(prev => ({ ...prev, ...patch }));

  // silencioso = recarga en segundo plano (sin indicador de carga ni mensaje de error)
  const cargar = async (silencioso = false) => {
    if (!silencioso) {
      setCargando(true);
      setErrorCarga('');
    }
    try {
      // Sin caché: siempre se muestra el último formato guardado por el administrador
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/autorizacion/plantilla`, { cache: 'no-store' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || 'Error');
      setFormato(data);
      set({ plantillaVersion: data.plantilla.version });
    } catch {
      if (!silencioso) setErrorCarga('No se pudo cargar el formato de autorización.');
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // Si la página quedó abierta mientras el administrador cambiaba el formato,
    // al volver a ella se carga la versión vigente (el documento mostrado es el que se firma)
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(true); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vista previa de la firma dentro del documento
  useEffect(() => {
    if (!value.firma) { setFirmaUrl(null); return; }
    const url = URL.createObjectURL(value.firma);
    setFirmaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value.firma]);

  const datos = useMemo(() => ({
    REPRESENTANTE_NOMBRE: value.nombre.trim(),
    REPRESENTANTE_CEDULA: value.cedula,
    REPRESENTANTE_TELEFONO: value.telefono,
    PARENTESCO: value.parentesco,
    JUGADOR_NOMBRE: jugador.nombre?.trim(),
    JUGADOR_CEDULA: jugador.identificacion,
    JUGADOR_EDAD: jugador.edad != null ? String(jugador.edad) : '',
    EQUIPO: jugador.equipo,
    SEGURO_MEDICO: value.seguro === 'SI' ? '[X] SÍ  /  [  ] NO' : value.seguro === 'NO' ? '[  ] SÍ  /  [X] NO' : '',
    ASEGURADORA: value.seguro === 'SI' ? value.aseguradora.trim().toUpperCase() : value.seguro === 'NO' ? 'NA (No Aplica)' : '',
    FECHA: fechaLarga(),
  }), [value, jugador]);

  const onImagen = (campo, etiqueta) => (e) => {
    const file = e.target.files?.[0];
    if (!file) { set({ [campo]: null }); return; }
    if (!file.type?.startsWith('image/')) {
      e.target.value = '';
      set({ [campo]: null });
      onError?.(`❌ ${etiqueta}: solo se permiten imágenes (JPG, PNG, etc.).`);
      return;
    }
    if (file.size > MAX_BYTES) {
      e.target.value = '';
      set({ [campo]: null });
      onError?.(`❌ ${etiqueta}: tamaño máximo 10MB.`);
      return;
    }
    set({ [campo]: file });
  };

  const onImagenOPdf = (campo, etiqueta) => async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) { set({ [campo]: null }); return; }
    if (file.size > MAX_BYTES) {
      input.value = '';
      set({ [campo]: null });
      onError?.(`❌ ${etiqueta}: tamaño máximo 10MB.`);
      return;
    }
    const r = await normalizarImagenOPdf(file);
    if (r.error) {
      input.value = '';
      set({ [campo]: null });
      onError?.(`❌ ${etiqueta}: ${r.error}`);
      return;
    }
    set({ [campo]: r.file });
  };

  return (
    <div className="aut-seccion">
      <h3 className="aut-seccion__titulo">✍️ Autorización del representante (jugador menor de edad)</h3>
      <p className="aut-seccion__ayuda">
        El padre, madre o representante legal debe estar presente: completa sus datos, revisa el documento y firma
        con el dedo (celular) o con el mouse (computador). Todos los campos son obligatorios.
      </p>

      {cargando && <p>Cargando formato de autorización…</p>}
      {errorCarga && (
        <p className="error">
          {errorCarga}{' '}
          <button type="button" className="btn-cerrar" onClick={() => cargar()}>Reintentar</button>
        </p>
      )}

      {formato && (
        <>
          <div className="campo">
            <label>Nombres y apellidos del representante</label>
            <input
              required
              value={value.nombre}
              placeholder="Nombres y apellidos completos"
              maxLength={120}
              disabled={disabled}
              onChange={e => {
                const val = e.target.value
                  .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '')
                  .trimStart()
                  .replace(/\s+/g, ' ')
                  .toUpperCase();
                set({ nombre: val });
              }}
            />
          </div>

          <div className="campo">
            <label>Cédula / pasaporte del representante</label>
            <input
              required
              value={value.cedula}
              placeholder="Identificación del representante"
              maxLength={20}
              disabled={disabled}
              onChange={e => set({ cedula: e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '') })}
            />
          </div>

          <div className="campo">
            <label>Parentesco con el jugador</label>
            <select
              required
              value={value.parentesco}
              disabled={disabled}
              onChange={e => set({ parentesco: e.target.value })}
            >
              <option value="">Seleccione…</option>
              {formato.parentescos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="campo">
            <label>Teléfono del representante</label>
            <input
              required
              type="tel"
              inputMode="tel"
              value={value.telefono}
              placeholder="Ej: 0991234567"
              maxLength={16}
              disabled={disabled}
              onChange={e => {
                let val = e.target.value.replace(/[^\d+]/g, '');
                val = val.charAt(0) + val.slice(1).replace(/\+/g, '');
                set({ telefono: val });
              }}
            />
          </div>

          <div className="campo">
            <label>¿El menor cuenta con seguro médico?</label>
            <div className="radio-row" role="radiogroup">
              {[['SI', 'SÍ'], ['NO', 'NO']].map(([val, texto]) => (
                <label key={val} className={`radio-opcion ${value.seguro === val ? 'radio-opcion--activa' : ''}`}>
                  <input
                    type="radio"
                    name="seguroMedico"
                    value={val}
                    required
                    checked={value.seguro === val}
                    disabled={disabled}
                    onChange={() => set({ seguro: val })}
                  />
                  {texto}
                </label>
              ))}
            </div>
          </div>

          {value.seguro === 'SI' && (
            <div className="campo">
              <label>Nombre de la Aseguradora / Cobertura (público o privado)</label>
              <input
                required
                value={value.aseguradora}
                placeholder="Ej: IESS, MSP, Seguros Equinoccial…"
                maxLength={120}
                disabled={disabled}
                onChange={e => set({ aseguradora: e.target.value.replace(/^\s+/, '').replace(/\s+/g, ' ') })}
              />
            </div>
          )}
          {value.seguro === 'NO' && (
            <div className="campo">
              <label>Nombre de la Aseguradora / Cobertura (público o privado)</label>
              <input readOnly className="readonly" value="NA (No Aplica)" />
            </div>
          )}

          <div className="campo">
            <label>Cédula del representante ambos lados (IMAGEN/FOTO o PDF)</label>
            <input
              type="file"
              required
              accept={ACCEPT_IMAGEN_PDF}
              disabled={disabled}
              onChange={onImagenOPdf('cedulaFile', 'Cédula del representante')}
            />
            <small className="aut-seccion__nota">
              Puedes subir una foto con ambos lados o un PDF. En iPhone puedes crear el PDF con
              "Escanear documentos" desde la app Archivos o Notas.
            </small>
          </div>

          <div className="campo">
            <label>Foto Selfie del representante sosteniendo su cédula (IMAGEN/FOTO)</label>
            <input
              type="file"
              required
              accept="image/*"
              disabled={disabled}
              onChange={onImagen('fotoFile', 'Foto del representante')}
            />
          </div>

          <p className="aut-seccion__subtitulo">Autorización del Menor</p>
          <DocumentoAutorizacion plantilla={formato.plantilla} datos={datos} firmaUrl={firmaUrl} />

          <div className="campo">
            <label>Firma del representante</label>
            <FirmaPad disabled={disabled} onChange={blob => set({ firma: blob })} />
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={value.acepta}
              disabled={disabled}
              onChange={e => set({ acepta: e.target.checked })}
            />
            <span>
              Declaro que soy el padre, madre o representante legal del jugador, que los datos ingresados son
              verídicos y que acepto el contenido de esta autorización, firmada electrónicamente.
            </span>
          </label>
        </>
      )}
    </div>
  );
}
