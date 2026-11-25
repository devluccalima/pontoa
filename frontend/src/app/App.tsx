import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '../api/queryClient'
import { AuthProvider } from '../auth/AuthProvider'
import { ToastProvider } from '../components/ui/ToastProvider'
import { AppRoutes } from '../routes/AppRoutes'
import { ThemeProvider } from '../theme/ThemeProvider'

export default function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
