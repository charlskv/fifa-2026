import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({
  onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
    if (registration) {
      console.log('Service worker registered:', swUrl)
    }
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
