import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthProvidersList, type SSOConfigStatus } from '@flamingo/ui-kit/components/features';
import { useAuthStore } from '@/stores/auth';
import { ssoService } from '@/services/sso';
import { GoogleOAuthService } from '@/services/GoogleOAuthService';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-screen bg-ods-bg flex items-center justify-center p-4">
      <div className="bg-ods-card rounded-lg shadow-lg p-6 w-full max-w-md border border-ods-border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-ods-text-primary mb-2">Welcome back</h1>
          <p className="text-ods-text-secondary">Sign in to access your account</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ods-text-primary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ods-text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-ods-bg border border-ods-border rounded-md focus:outline-none focus:ring-2 focus:ring-ods-accent text-ods-text-primary"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-ods-accent text-white py-2 px-4 rounded-md hover:bg-ods-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
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
      </div>
    </div>
  );
};