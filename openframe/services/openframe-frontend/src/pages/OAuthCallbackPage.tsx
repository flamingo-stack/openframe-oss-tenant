import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔑 [OAuth] Processing OAuth callback');
      console.log('🔑 [OAuth] Query params:', Object.fromEntries(searchParams.entries()));

      try {
        // Check if there's an error in the callback
        const error = searchParams.get('error');
        if (error) {
          console.error('🔑 [OAuth] OAuth error:', error);
          setStatus('error');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // The OAuth flow should have set HTTP-only cookies
        // Check authentication status
        const isAuthenticated = await checkAuthStatus();
        
        if (isAuthenticated) {
          console.log('🔑 [OAuth] OAuth successful, redirecting to dashboard');
          setStatus('success');
          navigate('/dashboard');
        } else {
          console.error('🔑 [OAuth] OAuth callback processed but user not authenticated');
          setStatus('error');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('🔑 [OAuth] Error processing OAuth callback:', error);
        setStatus('error');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, checkAuthStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Processing OAuth callback...</h2>
            <p className="text-muted-foreground">Please wait while we complete your sign-in.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-2">Sign-in successful!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-600 text-6xl mb-4">✗</div>
            <h2 className="text-xl font-semibold mb-2">Sign-in failed</h2>
            <p className="text-muted-foreground">Redirecting to login page...</p>
          </>
        )}
      </div>
    </div>
  );
};