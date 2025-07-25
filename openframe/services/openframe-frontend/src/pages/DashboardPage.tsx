import { useAuth } from '@/hooks/useAuth'

export const DashboardPage = () => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
                OpenFrame Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-border rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                🎉 Welcome to OpenFrame!
              </h2>
              <p className="text-muted-foreground">
                Your modern React frontend is ready. Time to build amazing features!
              </p>
              <div className="mt-6 text-sm text-muted-foreground">
                <p>✅ Cookie-based authentication</p>
                <p>✅ TanStack Query ready</p>
                <p>✅ Tailwind CSS configured</p>
                <p>✅ TypeScript setup</p>
                <p>✅ Testing framework ready</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}