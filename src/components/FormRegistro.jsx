import React, { useState } from 'react';
import dayjs from 'dayjs';

const cedulaRegex = /^\d{10}$/;
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

export default function FormRegistro() {
  const [form, setForm] = useState({
    codDirigente: '',
    firstName: '',
    lastName: '',
    dob: '',
    cedula: '',
    numjugador: '',
    team: ''
  });
  const [validCode, setValidCode] = useState(false);
  const [ageDisplay, setAgeDisplay] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [idBackImage, setBackImage] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  // modal para credenciales de admin
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const handleDob = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, dob: val }));
    if (val) setAgeDisplay(dayjs().diff(dayjs(val), 'year') + ' AÑOS');
    else setAgeDisplay('');
  };

  const validateCode = async (code) => {
    setForm(f => ({ ...f, codDirigente: code }));
    if (code.trim() === '') {
      setValidCode(false);
      setForm(f => ({ ...f, team: '' }));
      return;
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/teams/validate/${encodeURIComponent(code)}`);
      if (resp.ok) {
        const data = await resp.json();
        setValidCode(true);
        setForm(f => ({ ...f, team: data.team }));
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
      cedula: '',
      numjugador: '',
      team: ''
    });
    setIdFile(null);
    setBackImage(null);
    setSelfieFile(null);
    setAgeDisplay('');
    setValidCode(false);
    document.querySelectorAll('input[type="file"]').forEach(input => input.value = '');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validCode) return alert('Código de dirigente inválido');
    if (!nameRegex.test(form.firstName)) return alert('Nombres inválidos');
    if (!nameRegex.test(form.lastName)) return alert('Apellidos inválidos');
    if (!cedulaRegex.test(form.cedula)) return alert('Cédula inválida');
    if (!form.dob) return alert('Fecha requerida');
    if (!form.numjugador || isNaN(form.numjugador) || form.numjugador < 1 || form.numjugador > 99) return alert('Número inválido (1-99)');
    if (!idFile || !idBackImage || !selfieFile) return alert('Sube todas las imágenes');

    setLoading(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('idImage', idFile);
    fd.append('idBackImage', idBackImage);
    fd.append('selfieImage', selfieFile);

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

  // abrir modal para pedir credenciales de admin
  const handleDownloadClick = () => {
    setAdminUser('');
    setAdminPass('');
    setShowAdminModal(true);
  };

  // descarga Excel con basic auth
  const downloadExcel = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/users/export`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${adminUser}:${adminPass}`)
        }
      });
      if (!resp.ok) throw new Error('No se pudo generar el Excel');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jugadores.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setShowAdminModal(false);
    } catch (error) {
      setModalMessage('❌ Usuario o contraseña incorrecta');
      setShowModal(true);
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
        <h2 className="form-titulo">⚽ Registro de Jugador ⚽</h2>

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
          <label>Cédula</label>
          <input
            required
            value={form.cedula}
            maxLength={10} // máximo 10 números
            onChange={e => {
              const val = e.target.value.replace(/\D/g, ''); // solo números
              setForm(f => ({ ...f, cedula: val }));
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
        <div className="campo">
          <label>Foto frontal</label>
          <input type="file" required onChange={e => setIdFile(e.target.files[0])} disabled={loading}/>
        </div>

        <div className="campo">
          <label>Foto trasera</label>
          <input type="file" required onChange={e => setBackImage(e.target.files[0])} disabled={loading}/>
        </div>

        <div className="campo">
          <label>Selfie</label>
          <input type="file" required onChange={e => setSelfieFile(e.target.files[0])} disabled={loading}/>
        </div>

        <button type="submit" className="btn-enviar" disabled={loading}>Registrar Jugador 🏅</button>

        <button
          type="button"
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            cursor: "pointer",
            transition: "0.2s",
            marginTop: "10px"
          }}
          onClick={handleDownloadClick}
        >
          📥 Descargar Excel (admin)
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

      {/* Modal credenciales admin */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            backgroundColor: '#fff',
            position: 'relative'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px', color: '#333' }}>🔒 Credenciales de Admin</h3>
            
            <input
              type="text"
              placeholder="Usuario"
              value={adminUser}
              onChange={e => setAdminUser(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '16px'
              }}
            />
            
            <input
              type="password"
              placeholder="Contraseña"
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '20px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '16px'
              }}
            />

            {/* Botones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={async () => {
                  setLoading(true); // Mostrar loader
                  await downloadExcel();
                  setLoading(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
              >
                {loading ? '⏳ Procesando...' : 'Aceptar'}
              </button>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
