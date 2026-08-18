import './polyfills.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppStateProvider } from './state/AppStateContext.jsx'
import { OnboardingProvider } from './state/OnboardingContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <OnboardingProvider>
          <App />
        </OnboardingProvider>
      </AppStateProvider>
    </BrowserRouter>
  </StrictMode>,
)
