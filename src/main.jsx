import React from 'react'
import { createRoot } from 'react-dom/client'
import './utils/servicio' // despierta el backend apenas se carga la página (antes de renderizar)
import App from './App'

createRoot(document.getElementById('root')).render(<App />)
