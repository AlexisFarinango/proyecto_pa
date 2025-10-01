import React from 'react';
import FormRegistro from './components/FormRegistro';
import './styles.css'; // 👈 nuevo archivo para estilos globales futbolísticos

export default function App() {
  return (
    <div className="app-container">
      <h1 className="titulo-principal">🏆 Registro Futbolistas 🏆</h1>
      <FormRegistro />
    </div>
  );
}
