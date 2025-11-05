import React, { useState } from 'react';
import dayjs from 'dayjs';

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
  const [autorizacionFile, setAutorizacionFile] = useState(null);

  const [loading, setLoading] = useState(false);
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
    setAutorizacionFile(null);
    setAge(null);
    setAgeDisplay('');
    setValidCode(false);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validCode) return alert('Código de dirigente inválido');
    if (!nameRegex.test(form.firstName)) return alert('Nombres inválidos');
    if (!nameRegex.test(form.lastName)) return alert('Apellidos inválidos');
    if (!form.dob) return alert('Fecha requerida');
    const years = age ?? dayjs().diff(dayjs(form.dob), 'year');
    if (years < 14) {
      showMsg('❌ No se permiten registros menores de 14 años');
      return;
    }


    if (!identRegex.test(form.identificacion)) return alert('Identificación inválida (use letras, números o guiones)');
    if (!form.numjugador || isNaN(form.numjugador) || form.numjugador < 1 || form.numjugador > 99) return alert('Número inválido (1-99)');
    if (!idFile || !idBackImage || !selfieFile) return alert('Sube todas las imágenes');

     // autorización obligatoria si 14 ≤ edad < 18
    const requiereAut = years >= 14 && years < 18;
    if (requiereAut && !autorizacionFile) {
      showMsg('❌ Debe adjuntar autorización de padre/madre/representante');
      return;
    }


    setLoading(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('idImage', idFile);
    fd.append('idBackImage', idBackImage);
    fd.append('selfieImage', selfieFile);
    if (autorizacionFile) fd.append('autorizacion', autorizacionFile);

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, { method: 'POST', body: fd });
      const data = await resp.json();

      if (resp.ok) {
        setModalMessage('✅ Registrado correctamente');
        resetForm();
      } else {
        setModalMessage(`❌ ${data.message || 'Error al registrar'}`);
      }
    } catch (error) {
      setModalMessage('❌ Error al conectar con el servidor');
    } finally {
      setShowModal(true);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Loader */}
      {loading && (
        <div className="overlay-loader">
          <div className="ball-loader"></div>
          <p>Registrando jugador...</p>
        </div>
      )}

      <form onSubmit={submit} className="form-futbol">
        <div className="brand-header">
          <img src="/logo-liga.png" alt="Liga Deportiva Bienestar Familiar de Calderón" className="brand-badge" />
          <h1 className="brand-title">Liga Deportiva Bienestar Familiar de Calderón</h1>
          <p className="brand-subtitle">Acuerdo ministerial N. 0184 – 15 agosto 2023</p>
          <p className="brand-subtitle brand-subtitle--thin">Nómina de jugadores – 6º campeonato de indorfútbol masculino</p>
        </div>


        {/* Código Dirigente */}
        <div className="campo">
          <label>Código de Dirigente</label>
          <input
            required
            value={form.codDirigente}
            onChange={e => validateCode(e.target.value)}
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
            maxLength={100} // máximo 100 caracteres
            onChange={e => {
              const val = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''); // solo letras y espacios
              setForm(f => ({ ...f, firstName: val.toUpperCase() }));
            }}
            disabled={loading}
          />
        </div>

        <div className="campo">
          <label>Apellidos</label>
          <input
            required
            value={form.lastName}
            maxLength={100} // máximo 100 caracteres
            onChange={e => {
              const val = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''); // solo letras y espacios
              setForm(f => ({ ...f, lastName: val.toUpperCase() }));
            }}
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

        <p style={{ fontSize: 14, marginTop: -10 }}>
          Nota: si el documento de identificación es <b>pasaporte</b>, sube la misma imagen/archivo en “Cédula frontal” y “Cédula trasera”.
        </p>

        <div className="campo">
          <label>Cédula/Pasaporte - Parte Frontal</label>
          <input type="file" required onChange={e => setIdFile(e.target.files[0])} disabled={loading}/>
        </div>

        <div className="campo">
          <label>Foto Cédula/Pasaporte - Parte Trasera</label>
          <input type="file" required onChange={e => setBackImage(e.target.files[0])} disabled={loading}/>
        </div>

        <div className="campo">
          <label>Selfie Jugador</label>
          <input type="file" required onChange={e => setSelfieFile(e.target.files[0])} disabled={loading}/>
        </div>

        {/* Autorización condicional */}
        {(age !== null && age >= 14 && age < 18) && (
          <div className="campo">
            <label>Autorización padre/madre/representante (imagen o PDF)</label>
            <input type="file" onChange={e => setAutorizacionFile(e.target.files[0])} disabled={loading} required />
          </div>
        )}
        

        <button type="submit" className="btn-enviar" disabled={loading}>Registrar Jugador 🏅</button>

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
  );
}
