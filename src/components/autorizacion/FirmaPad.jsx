import React, { useEffect, useRef, useState } from 'react';

// Recuadro para firmar con el dedo (celular) o con el mouse (computador).
// Guarda los trazos para redibujarlos si cambia el tamaño de pantalla y
// entrega la firma recortada como PNG transparente mediante onChange(blob | null).
export default function FirmaPad({ onChange, disabled = false, height = 180 }) {
  const canvasRef = useRef(null);
  const trazos = useRef([]);
  const actual = useRef(null);
  const anchoPrevio = useRef(0);
  const dprPrevio = useRef(0);
  const [vacia, setVacia] = useState(true);

  const dibujar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Limpia el lienzo completo sin escala: con zoom del navegador < 100% el dpr es < 1
    // y limpiar con la escala aplicada dejaba restos de la firma a la derecha
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const escala = canvas.width / (canvas.clientWidth || 1);
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    pintarTrazos(ctx, trazos.current, 0, 0);
  };

  const ajustarTamano = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ancho = canvas.clientWidth;
    if (!ancho) return;
    const dpr = window.devicePixelRatio || 1;
    // En celulares el alto de la ventana cambia al hacer scroll: solo reaccionamos al ancho o al zoom
    if (ancho === anchoPrevio.current && dpr === dprPrevio.current) return;
    const escala = anchoPrevio.current ? ancho / anchoPrevio.current : 1;
    if (anchoPrevio.current && escala !== 1) {
      trazos.current = trazos.current.map(t => t.map(p => ({ x: p.x * escala, y: p.y })));
    }
    anchoPrevio.current = ancho;
    dprPrevio.current = dpr;
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(height * dpr);
    dibujar();
  };

  useEffect(() => {
    ajustarTamano();
    window.addEventListener('resize', ajustarTamano);
    // También detecta cambios de ancho del contenedor (ej. al aparecer dentro de un modal)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(ajustarTamano) : null;
    ro?.observe(canvasRef.current);
    return () => {
      window.removeEventListener('resize', ajustarTamano);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const punto = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    actual.current = [punto(e)];
    trazos.current.push(actual.current);
    dibujar();
  };

  const onMove = (e) => {
    if (!actual.current) return;
    e.preventDefault();
    actual.current.push(punto(e));
    dibujar();
  };

  const onUp = () => {
    if (!actual.current) return;
    actual.current = null;
    exportar();
  };

  const exportar = () => {
    const pts = trazos.current.flat();
    const bbox = limites(pts);
    // Firma demasiado pequeña o un simple punto: no se acepta
    if (pts.length < 8 || bbox.w < 30) {
      setVacia(pts.length === 0);
      onChange?.(null);
      return;
    }
    setVacia(false);
    const pad = 8;
    const escala = 2;
    const off = document.createElement('canvas');
    off.width = Math.ceil((bbox.w + pad * 2) * escala);
    off.height = Math.ceil((bbox.h + pad * 2) * escala);
    const ctx = off.getContext('2d');
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    pintarTrazos(ctx, trazos.current, bbox.x - pad, bbox.y - pad);
    off.toBlob(blob => onChange?.(blob), 'image/png');
  };

  const limpiar = () => {
    trazos.current = [];
    actual.current = null;
    setVacia(true);
    dibujar();
    onChange?.(null);
  };

  return (
    <div className={`firma-pad ${disabled ? 'firma-pad--disabled' : ''}`}>
      <canvas
        ref={canvasRef}
        style={{ height }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
        aria-label="Recuadro de firma"
      />
      {vacia && <span className="firma-pad__hint">Firme aquí ✍️</span>}
      <div className="firma-pad__linea" />
      <button type="button" className="firma-pad__limpiar" onClick={limpiar} disabled={disabled}>
        Borrar firma
      </button>
    </div>
  );
}

function pintarTrazos(ctx, trazos, dx, dy) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0b2a6d';
  ctx.fillStyle = '#0b2a6d';
  ctx.lineWidth = 2.4;
  for (const t of trazos) {
    if (t.length === 1) {
      ctx.beginPath();
      ctx.arc(t[0].x - dx, t[0].y - dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(t[0].x - dx, t[0].y - dy);
    // Curvas suaves entre puntos medios
    for (let i = 1; i < t.length - 1; i++) {
      const mx = (t[i].x + t[i + 1].x) / 2;
      const my = (t[i].y + t[i + 1].y) / 2;
      ctx.quadraticCurveTo(t[i].x - dx, t[i].y - dy, mx - dx, my - dy);
    }
    const u = t[t.length - 1];
    ctx.lineTo(u.x - dx, u.y - dy);
    ctx.stroke();
  }
}

function limites(pts) {
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
