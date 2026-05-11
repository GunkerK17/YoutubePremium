// src/main.jsx
// Entry point — mount App vào #root

import { StrictMode } from 'react'
import './index.css'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)