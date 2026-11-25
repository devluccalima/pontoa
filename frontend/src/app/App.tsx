import { AuthProvider } from '../auth/AuthProvider'
import { AppRoutes } from '../routes/AppRoutes'
import { ThemeProvider } from '../theme/ThemeProvider'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
