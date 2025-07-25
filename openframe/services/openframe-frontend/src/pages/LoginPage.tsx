import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export const LoginPage = () => {
  const { login, loginWithGoogle, loginWithAzure, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
      // Navigation happens automatically in useAuth
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Sign in to OpenFrame
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose your preferred authentication method
          </p>
        </div>
        
        {/* SSO Buttons */}
        <div className="space-y-3">
          <button
            onClick={loginWithGoogle}
            className={cn(
              "w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            )}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          
          <button
            onClick={loginWithAzure}
            className={cn(
              "w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            )}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M0 0h11v11H0zm13 0h11v11H13zM0 13h11v11H0zm13 0h11v11H13z"/>
            </svg>
            Continue with Azure AD
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-background text-muted-foreground">or</span>
          </div>
        </div>

        {/* Traditional Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "mt-1 w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                "bg-background text-foreground"
              )}
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "mt-1 w-full px-3 py-2 border border-input rounded-md shadow-sm placeholder-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                "bg-background text-foreground"
              )}
              required
            />
          </div>
          
          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            )}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}