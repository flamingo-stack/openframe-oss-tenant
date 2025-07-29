import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const authStore = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🚦 [ProtectedRoute] Checking authentication for:', location.pathname);
      
      try {
        const authenticated = await authStore.checkAuthStatus();
        setIsAuthenticated(authenticated);
        
        if (!authenticated) {
          console.log('🔒 [ProtectedRoute] Not authenticated, will redirect to login');
        } else {
          console.log('✅ [ProtectedRoute] Authentication verified');
        }
      } catch (error) {
        console.error('❌ [ProtectedRoute] Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [location.pathname, authStore]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ods-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ods-accent mx-auto mb-4"></div>
          <p className="text-ods-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔄 [ProtectedRoute] Redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};