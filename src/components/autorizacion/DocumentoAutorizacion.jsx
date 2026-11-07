import React from 'react';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const fechaLarga = (d = new Date()) =>
  `${d.getDate()} de ${MESES[d.getMonth()]} del ${d.getFullYear()}`;

export const datosEjemplo = (placeholders = []) => {
  const d = {};
  placeholders.forEach(p => { d[p.key] = p.ejemplo; });
  d.FECHA = fechaLarga();
  return d;
};

// Valida en el navegador lo mismo que el backend (campos desconocidos / obligatorios)
export const revisarPlantilla = (plantilla, placeholders = []) => {
  const keys = placeholders.map(p => p.key);
  const todos = ['titulo', 'destinatario', 'cuerpo', 'ciudad', 'nota', 'despedida']
    .map(c => plantilla[c] || '').join('\n');
  const usados = [...todos.matchAll(/\{\{\s*([A-Z_]+)\s*\}\}/g)].map(m => m[1]);
  const desconocidos = [...new Set(usados.filter(k => !keys.includes(k)))];
  const faltantes = placeholders.filter(p => p.obligatorio && !(plantilla.cuerpo || '').includes(`{{${p.key}}}`));
  const errores = [];
  if (!(plantilla.cuerpo || '').trim()) errores.push('El cuerpo es obligatorio.');
  if (!(plantilla.ciudad || '').trim()) errores.push('La ciudad es obligatoria.');
  if (desconocidos.length) errores.push(`Campos no reconocidos: ${desconocidos.map(k => `{{${k}}}`).join(', ')}`);
  if (faltantes.length) errores.push(`El cuerpo debe incluir: ${faltantes.map(p => `{{${p.key}}}`).join(', ')}`);
  return errores;
};

// Reemplaza {{CAMPOS}} por los datos (en negrita) o por una línea en blanco si aún no se llenan
function Rellenar({ texto, datos }) {
  const partes = [];
  const re = /\{\{\s*([A-Z_]+)\s*\}\}/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > last) partes.push(texto.slice(last, m.index));
    const val = datos[m[1]];
    partes.push(val
      ? <b key={i++}>{val}</b>
      : <span key={i++} className="doc-aut__vacio">{'_'.repeat(14)}</span>);
    last = re.lastIndex;
  }
  if (last < texto.length) partes.push(texto.slice(last));
  return <>{partes}</>;
}

function Lineas({ texto, datos }) {
  const lineas = texto.split('\n');
  return lineas.map((l, i) => (
    <React.Fragment key={i}>
      <Rellenar texto={l} datos={datos} />
      {i < lineas.length - 1 && <br />}
    </React.Fragment>
  ));
}

// Vista del documento tal como se generará el PDF
export default function DocumentoAutorizacion({ plantilla, datos, firmaUrl = null, firmaEjemplo = false }) {
  if (!plantilla) return null;
  const parrafos = (plantilla.cuerpo || '').split(/\n\s*\n/);
  return (
    <div className="doc-aut">
      <img src="/logo-liga.png" alt="" className="doc-aut__logo" />
      {plantilla.titulo && <p className="doc-aut__titulo">{plantilla.titulo}</p>}
      {plantilla.destinatario && (
        <p className="doc-aut__destinatario"><Lineas texto={plantilla.destinatario} datos={datos} /></p>
      )}
      {parrafos.map((p, i) => (
        <p key={i} className="doc-aut__parrafo"><Lineas texto={p} datos={datos} /></p>
      ))}
      <p className="doc-aut__fecha">{plantilla.ciudad}, {datos.FECHA}</p>
      {plantilla.nota && <p className="doc-aut__nota"><Rellenar texto={plantilla.nota} datos={datos} /></p>}
      {plantilla.despedida && <p>{plantilla.despedida}</p>}

      <div className="doc-aut__firma">
        {firmaUrl
          ? <img src={firmaUrl} alt="Firma" />
          : firmaEjemplo
            ? (
              <svg viewBox="0 0 200 64" width="200" height="64" aria-hidden="true">
                <path d="M 5 45 C 15 10, 25 10, 30 35 S 45 60, 55 30 S 70 5, 80 35 C 85 50, 95 50, 105 25 C 110 15, 120 15, 118 35 C 116 50, 130 45, 140 30 L 150 40 C 160 50, 175 30, 190 28"
                  fill="none" stroke="#0b2a6d" strokeWidth="1.8" />
              </svg>
            )
            : <span className="doc-aut__sin-firma">(firma)</span>}
      </div>
      <div className="doc-aut__linea" />
      <p className="doc-aut__datos-firma">
        <b>NOMBRE:</b> {datos.REPRESENTANTE_NOMBRE || ''}<br />
        <b>C.I.:</b> {datos.REPRESENTANTE_CEDULA || ''}<br />
        <b>TELÉFONO:</b> {datos.REPRESENTANTE_TELEFONO || ''}<br />
        <b>PARENTESCO:</b> {datos.PARENTESCO || ''}
      </p>
    </div>
  );
}
