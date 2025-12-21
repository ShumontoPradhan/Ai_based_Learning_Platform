import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import {Toaster} from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './store/auth.jsx'

createRoot(document.getElementById('root')).render(
   <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
