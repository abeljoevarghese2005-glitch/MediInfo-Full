import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/capacitor'
import * as SentryReact from '@sentry/react'
import './index.css'
import './i18n'
import App from './App.jsx'
import { initSupabaseStorage } from './lib/supabase.js'

Sentry.init(
  {
    dsn: "https://ffc03c5eb618075c31c032a6d5b53965@o4512145575378944.ingest.us.sentry.io/4512145605656576",
    environment: import.meta.env.MODE,
  },
  SentryReact.init
)

initSupabaseStorage().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})