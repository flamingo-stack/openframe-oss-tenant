import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthProvidersList, type SSOConfigStatus } from '@flamingo/ui-kit/components/features';
import { Button } from '@flamingo/ui-kit/components/ui';
import { useAuthStore } from '@/stores/auth';
import { ssoService } from '@/services/sso';
import { GoogleOAuthService } from '@/services/GoogleOAuthService';
import { AuthFormContainer } from '@/components/auth/AuthFormContainer';
import { FormField } from '@/components/auth/FormField';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [enabledProviders, setEnabledProviders] = useState<SSOConfigStatus[]>([]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    // Check for OAuth debug info on component load
    checkOAuthDebugInfo();
    // Load SSO providers
    loadSSOProviders();
  }, []);

  const loadSSOProviders = async () => {
    try {
      const providers = await ssoService.getEnabledProviders();
      const enabledProviders = providers.filter(provider => provider.enabled);
      setEnabledProviders(enabledProviders);
      console.log('🔑 [LoginPage] Enabled providers loaded:', enabledProviders);
    } catch (err) {
      console.error('Failed to load SSO providers:', err);
    }
  };

  const handleProviderClick = async (provider: string) => {
    try {
      console.log(`🔑 [LoginPage] ${provider} provider clicked`);
      
      // Handle different providers
      switch (provider.toLowerCase()) {
        case 'google':
          await GoogleOAuthService.initiateLogin();
          break;
        default:
          console.warn(`⚠️ [LoginPage] No handler implemented for provider: ${provider}`);
          break;
      }
      
    } catch (error) {
      console.error(`❌ [LoginPage] Error initiating ${provider} login:`, error);
    }
  };

  const checkOAuthDebugInfo = () => {
    const debugInfo = localStorage.getItem('oauth_debug');
    const configDebug = localStorage.getItem('oauth_config_debug');
    const errorDebug = localStorage.getItem('oauth_error_debug');
    const redirectDebug = localStorage.getItem('oauth_redirect_debug');
    const initiateErrorDebug = localStorage.getItem('oauth_initiate_error_debug');
    
    if (debugInfo) {
      console.log('🔍 [Login] OAuth Debug Info:', JSON.parse(debugInfo));
    }
    if (configDebug) {
      console.log('🔍 [Login] OAuth Config Debug:', JSON.parse(configDebug));
    }
    if (errorDebug) {
      console.log('🔍 [Login] OAuth Error Debug:', JSON.parse(errorDebug));
    }
    if (redirectDebug) {
      console.log('🔍 [Login] OAuth Redirect Debug:', JSON.parse(redirectDebug));
    }
    if (initiateErrorDebug) {
      console.log('🔍 [Login] OAuth Initiate Error Debug:', JSON.parse(initiateErrorDebug));
    }
    
    // Clear debug info after reading
    localStorage.removeItem('oauth_debug');
    localStorage.removeItem('oauth_config_debug');
    localStorage.removeItem('oauth_error_debug');
    localStorage.removeItem('oauth_redirect_debug');
    localStorage.removeItem('oauth_initiate_error_debug');
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔑 [Login] Starting login process');
      await authStore.login(email, password);
      console.log('✅ [Login] Login successful, navigating to:', from);
      
      // Wait a moment to ensure tokens are stored
      await new Promise(resolve => setTimeout(resolve, 100));
      
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('❌ [Login] Login failed:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title="Welcome back"
      subtitle="Sign in to access your account"
      error={error}
    >
      <div className="space-y-4">
        <FormField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        
        <FormField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={isLoading}
          onClick={handleLogin}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>
      
      <div className="mt-6">
        <AuthProvidersList
          enabledProviders={enabledProviders}
          onProviderClick={handleProviderClick}
          loading={isLoading}
          showDivider={enabledProviders.length > 0}
          dividerText="or"
        />
      </div>
      
      <div className="text-center mt-6">
        <p className="text-ods-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-ods-accent hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </AuthFormContainer>
  );
};