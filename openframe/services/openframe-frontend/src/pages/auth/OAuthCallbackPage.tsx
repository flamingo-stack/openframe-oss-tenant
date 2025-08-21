import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authStore = useAuthStore();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔑 [OAuth] OAuth callback received');
      console.log('🔑 [OAuth] URL params:', Object.fromEntries(searchParams));

      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('❌ [OAuth] OAuth error:', error);
        navigate('/auth?error=oauth_failed');
        return;
      }

      if (!code) {
        console.error('❌ [OAuth] No authorization code received');
        navigate('/auth?error=no_code');
        return;
      }

      try {
        console.log('🔄 [OAuth] Processing OAuth callback...');
        
        // Check auth status (the OAuth flow should have set the cookies)
        const isAuthenticated = await authStore.checkAuthStatus();
        
        if (isAuthenticated) {
          console.log('✅ [OAuth] OAuth login successful, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.error('❌ [OAuth] Authentication failed after OAuth callback');
          navigate('/auth?error=auth_failed');
        }
      } catch (error) {
        console.error('❌ [OAuth] Error processing OAuth callback:', error);
        navigate('/auth?error=callback_failed');
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams, authStore]);

  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ods-accent mx-auto mb-4"></div>
        <p className="text-ods-text-primary">Processing OAuth login...</p>
        <p className="text-ods-text-secondary text-sm mt-2">Please wait while we log you in</p>
      </div>
    </div>
  );
};