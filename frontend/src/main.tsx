import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/ibm-plex-sans'
import App from './app/App'
import { applyTheme, initialTheme } from './theme/theme'
import './styles/global.css'

// Antes do primeiro render, para não piscar o tema errado.
applyTheme(initialTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
