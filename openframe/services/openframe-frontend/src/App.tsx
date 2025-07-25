import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: 1, 
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <AuthGuard>
              <DashboardPage />
            </AuthGuard>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}