import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Scrolling the mouse wheel while a number input happens to be focused
// silently changes its value in every browser — blur it on wheel instead, so
// scrolling the page never edits an amount field by accident. Attached once
// at the document level (capture phase) so it covers every number input
// app-wide without touching each one individually.
document.addEventListener(
  'wheel',
  (e) => {
    if (document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'number') {
      document.activeElement.blur()
    }
  },
  { passive: true, capture: true }
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
