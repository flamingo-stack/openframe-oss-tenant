import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🚦 [ProtectedRoute] Checking authentication for:', location.pathname);
      
      try {
        const isAuth = await checkAuthStatus();
        console.log('🚦 [ProtectedRoute] Auth check result:', isAuth);
        setAuthChecked(true);
      } catch (error) {
        console.error('🚦 [ProtectedRoute] Auth check failed:', error);
        setAuthChecked(true);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [checkAuthStatus, location.pathname]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authChecked && !isAuthenticated) {
    console.log('🔒 [ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content if authenticated
  return <>{children}</>;
};