import { StrictMode } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import App from './App'
import './index.css'

export function Root() {
  return (
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
}
