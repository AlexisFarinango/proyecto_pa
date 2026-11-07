// Los PDF guardados en Cloudinary ("raw") no se pueden abrir directo (Cloudinary bloquea su
// entrega pública), así que se abren a través del backend. Las imágenes se abren directo.
export const urlArchivo = (url) =>
  url && url.includes('/raw/upload/')
    ? `${import.meta.env.VITE_API_URL}/api/archivos/ver?url=${encodeURIComponent(url)}`
    : url;
