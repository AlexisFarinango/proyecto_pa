// Los PDF guardados en Cloudinary ("raw") no se pueden abrir directo (Cloudinary bloquea su
// entrega pública), así que se abren a través del backend. Las imágenes se abren directo.
export const urlArchivo = (url) =>
  url && url.includes('/raw/upload/')
    ? `${import.meta.env.VITE_API_URL}/api/archivos/ver?url=${encodeURIComponent(url)}`
    : url;

export const MAX_BYTES_ARCHIVO = 10 * 1024 * 1024;

// Imagen o PDF. Se listan extensiones explícitas porque en iPhone (Safari) así el selector
// ofrece Fotos, Cámara y la app Archivos (PDF escaneados con "Escanear documentos").
export const ACCEPT_IMAGEN_PDF = 'image/*,.heic,.heif,application/pdf,.pdf';

const EXT_IMAGEN = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp' };

/**
 * Detecta si el archivo es imagen o PDF (iPhone, Android o PC). En iPhone los PDF que vienen de
 * Archivos, iCloud o WhatsApp suelen llegar sin tipo ("") o como "application/octet-stream", y
 * las fotos en HEIC; por eso se revisa extensión y contenido.
 * Devuelve { file } (normalizado) o { error }.
 */
export async function normalizarImagenOPdf(file) {
  if (!file.size) {
    return { error: 'el archivo está vacío. Si está en iCloud, espera a que termine de descargarse e inténtalo de nuevo.' };
  }
  if (file.size > MAX_BYTES_ARCHIVO) {
    return { error: 'tamaño máximo 10MB.' };
  }
  let head;
  try {
    head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  } catch {
    return { error: 'no se pudo leer el archivo. Inténtalo de nuevo.' };
  }
  const esPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'archivo';

  if (esPdf) {
    return { file: file.type === 'application/pdf' && ext === 'pdf'
      ? file
      : new File([file], `${nombreBase}.pdf`, { type: 'application/pdf' }) };
  }
  if (file.type === 'application/pdf' || ext === 'pdf') {
    return { error: 'el PDF está dañado o no es un PDF válido.' };
  }
  if (file.type.startsWith('image/')) return { file };
  if (EXT_IMAGEN[ext]) return { file: new File([file], file.name, { type: EXT_IMAGEN[ext] }) };
  return { error: 'solo se permiten imágenes (JPG, PNG, HEIC, etc.) o PDF.' };
}
