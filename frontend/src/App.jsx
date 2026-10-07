import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { AppRoutes } from '@/routes'
import { useTheme } from '@/hooks/useTheme'

function ThemedToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      theme={theme}
      richColors
      position="top-right"
      closeButton
    />
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter>
            <AppRoutes />
            <ThemedToaster />
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
