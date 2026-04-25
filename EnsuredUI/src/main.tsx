import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { apiFetch } from './lib/auth'

// Override global fetch to automatically include Authorization when available.
if (typeof window !== 'undefined' && (window as any).fetch !== apiFetch) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.fetch = (input: RequestInfo, init?: RequestInit) => apiFetch(input, init as any) as any;
}

const container = document.getElementById('root')!
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
