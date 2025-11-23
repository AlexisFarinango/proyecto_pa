import React from 'react';
import FormRegistro from './components/FormRegistro';
import './styles.css';
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import VerJugadores from "./components/VerJugadores";
import LoginDirigente from "./components/LoginDirigente";
import PanelDirigente from "./components/PanelDirigente";
import AdminLogin from "./components/admin/AdminLogin";
import AdminPortal from "./components/admin/AdminPortal";
import FixturePublic from "./components/FixturePublic";


export default function App() {
  return (
    <Router>
      <nav className="top-nav">
        <NavLink to="/" end className={({isActive}) => `nav-btn${isActive ? ' is-active' : ''}`}>
          Registro
        </NavLink>
        <NavLink to="/ver-jugadores" className={({isActive}) => `nav-btn${isActive ? ' is-active' : ''}`}>
          Ver Jugadores
        </NavLink>
        <NavLink to="/dirigente" className={({isActive}) => `nav-btn${isActive ? ' is-active' : ''}`}>
          Dirigente
        </NavLink>
        <NavLink to="/admin" className={({isActive}) => `nav-btn${isActive ? ' is-active' : ''}`}>
          Admin
        </NavLink>
        <NavLink to="/fixture" className={({isActive}) => `nav-btn${isActive ? ' is-active' : ''}`}>
          Programación de partidos
        </NavLink>

      </nav>

      <div style={{ padding: "20px" }}>
        <Routes>
          <Route path="/" element={<FormRegistro />} />
          <Route path="/ver-jugadores" element={<VerJugadores />} />
          <Route path="/dirigente" element={<LoginDirigente />} />
          <Route path="/panel-dirigente" element={<PanelDirigente />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/portal" element={<AdminPortal />} />
          <Route path="/fixture" element={<FixturePublic />} />
        </Routes>
      </div>
    </Router>
  );
}
