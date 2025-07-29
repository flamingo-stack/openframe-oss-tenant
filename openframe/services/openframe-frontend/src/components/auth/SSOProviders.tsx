import React, { useState, useEffect } from 'react';
import { GoogleOAuthService } from '@/services/GoogleOAuthService';
import { ssoService, type SSOConfigStatus } from '@/services/sso';

interface SSOProviderButtonProps {
  provider: SSOConfigStatus;
}

const SSOProviderButton: React.FC<SSOProviderButtonProps> = ({ provider }) => {
  const handleOAuthLogin = async () => {
    try {
      console.log(`🔑 [SSO] ${provider.provider} button clicked`);
      
      if (!provider.enabled) {
        console.error(`❌ [SSO] ${provider.provider} OAuth is not enabled`);
        return;
      }
      
      console.log(`🚀 [SSO] Initiating ${provider.provider} OAuth flow`);
      
      // Handle different providers
      switch (provider.provider.toLowerCase()) {
        case 'google':
          await GoogleOAuthService.initiateLogin();
          break;
        default:
          console.warn(`⚠️ [SSO] No handler implemented for provider: ${provider.provider}`);
          break;
      }
      
    } catch (error) {
      console.error(`❌ [SSO] Error initiating ${provider.provider} login:`, error);
    }
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'google':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#00BCF2" d="M0 0h11.377v11.372H0z"/>
            <path fill="#0078D4" d="M12.623 0H24v11.372H12.623z"/>
            <path fill="#00BCF2" d="M0 12.623h11.377V24H0z"/>
            <path fill="#40E0D0" d="M12.623 12.623H24V24H12.623z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      default:
        return (
          <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white font-bold">
            {providerName.charAt(0).toUpperCase()}
          </div>
        );
    }
  };

  const getProviderDisplayName = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'google':
        return 'Continue with Google';
      case 'microsoft':
        return 'Continue with Microsoft';
      case 'github':
        return 'Continue with GitHub';
      default:
        return `Continue with ${providerName.charAt(0).toUpperCase() + providerName.slice(1)}`;
    }
  };

  return (
    <button
      onClick={handleOAuthLogin}
      className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 py-2 px-4 rounded-md"
    >
      {getProviderIcon(provider.provider)}
      {getProviderDisplayName(provider.provider)}
    </button>
  );
};

export const SSOProviders: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [enabledProviders, setEnabledProviders] = useState<SSOConfigStatus[]>([]);

  useEffect(() => {
    loadSSOProviders();
  }, []);

  const loadSSOProviders = async () => {
    setIsLoading(true);
    
    try {
      const providers = await ssoService.getEnabledProviders();
      const enabledProviders = providers.filter(provider => provider.enabled);
      setEnabledProviders(enabledProviders);
      console.log('🔑 [SSOProviders] Enabled providers loaded:', enabledProviders);
    } catch (err) {
      console.error('Failed to load SSO providers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything if loading or no providers
  if (isLoading || enabledProviders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-ods-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-ods-card text-ods-text-secondary">or</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {enabledProviders.map((provider) => (
          <SSOProviderButton key={provider.provider} provider={provider} />
        ))}
      </div>
    </div>
  );
};