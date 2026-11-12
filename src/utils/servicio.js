import { useEffect, useState } from 'react';

/**
 * Estado del backend (Render gratuito se apaga tras 15 min sin uso y tarda ~1 min en encender).
 * - Apenas se carga la página se llama a /api/health para "despertarlo".
 * - Se reintenta hasta que responde OK (servidor encendido y MongoDB conectado).
 * - Mientras la página está abierta y visible se hace un ping periódico para que no vuelva a dormirse.
 */
const API = import.meta.env.VITE_API_URL;
const TIMEOUT_INTENTO = 15000;          // espera máxima por intento
const PAUSA_REINTENTO = 3000;           // pausa entre intentos
const LIMITE_ESPERA = 3 * 60 * 1000;    // después de 3 min se muestra la opción de reintentar
const PING_MANTENER = 5 * 60 * 1000;    // ping de mantenimiento (Render duerme a los 15 min)

let estado = 'cargando'; // 'cargando' | 'listo' | 'error'
let ultimaConfirmacion = 0;
let enCurso = null;
const oyentes = new Set();

const setEstado = (nuevo) => {
  if (estado === nuevo) return;
  estado = nuevo;
  oyentes.forEach(fn => fn(estado));
};

async function ping() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_INTENTO);
  try {
    const resp = await fetch(`${API}/api/health`, { cache: 'no-store', signal: ctrl.signal });
    return resp.ok;
  } catch {
    return false; // servidor despertando, red caída o respuesta sin CORS durante el arranque
  } finally {
    clearTimeout(t);
  }
}

/** Despierta el backend y espera a que esté listo. Devuelve true si quedó listo. */
export function despertarServicio() {
  if (enCurso) return enCurso;
  if (estado !== 'listo') setEstado('cargando');
  enCurso = (async () => {
    const inicio = Date.now();
    while (Date.now() - inicio < LIMITE_ESPERA) {
      if (await ping()) {
        ultimaConfirmacion = Date.now();
        setEstado('listo');
        return true;
      }
      await new Promise(r => setTimeout(r, PAUSA_REINTENTO));
    }
    setEstado('error');
    return false;
  })().finally(() => { enCurso = null; });
  return enCurso;
}

/**
 * Asegura que el servicio siga encendido justo antes de una acción importante (ej. registrar).
 * Si se confirmó hace poco no hace nada; si no, vuelve a verificar (mostrando "cargando" si hace falta).
 */
export async function asegurarServicio() {
  if (estado === 'listo' && Date.now() - ultimaConfirmacion < 60 * 1000) return true;
  if (estado === 'listo' && (await ping())) {
    ultimaConfirmacion = Date.now();
    return true;
  }
  return servicioCaido();
}

/** Marca el servicio como no disponible (ej. falló un envío por red) y lo vuelve a despertar. */
export function servicioCaido() {
  setEstado('cargando');
  return despertarServicio();
}

/** Hook: estado actual del servicio para la UI. */
export function useServicio() {
  const [valor, setValor] = useState(estado);
  useEffect(() => {
    oyentes.add(setValor);
    setValor(estado);
    return () => oyentes.delete(setValor);
  }, []);
  return { estado: valor, listo: valor === 'listo', reintentar: despertarServicio };
}

// ---- Arranque automático al cargar la página ----
if (typeof window !== 'undefined' && API) {
  despertarServicio();

  // Mantener despierto mientras la página está abierta y visible
  setInterval(() => {
    if (document.visibilityState !== 'visible' || enCurso) return;
    ping().then(ok => {
      if (ok) ultimaConfirmacion = Date.now();
      else servicioCaido();
    });
  }, PING_MANTENER);

  // Al volver a la pestaña después de un rato, verificar que siga encendido
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - ultimaConfirmacion > PING_MANTENER) {
      ping().then(ok => {
        if (ok) { ultimaConfirmacion = Date.now(); setEstado('listo'); }
        else servicioCaido();
      });
    }
  });
}
