import React, { useState } from 'react';
import { Button } from '@flamingo/ui-kit/components/ui';

interface ProviderButtonProps {
  provider: 'google' | 'microsoft';
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
}

const PROVIDER_CONFIG = {
  google: {
    displayName: 'Continue with Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  microsoft: {
    displayName: 'Continue with Microsoft',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="#00BCF2"/>
      </svg>
    ),
  },
};

export function ProviderButton({ provider, onClick, disabled = false, loading = false }: ProviderButtonProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const config = PROVIDER_CONFIG[provider];
  
  // Use external loading state if provided, otherwise use internal state
  const isLoading = loading || internalLoading;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (disabled || isLoading) {
      return;
    }
    
    try {
      if (!loading) {
        setInternalLoading(true);
      }
      await onClick();
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
    } finally {
      if (!loading) {
        setInternalLoading(false);
      }
    }
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant="outline"
      size="default"
      leftIcon={
        isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-ods-text-primary border-t-transparent" />
        ) : (
          config.icon
        )
      }
      className={`
        w-full h-[56px] 
        !text-[16px] !font-bold !leading-tight
        hover:bg-ods-bg-hover border-ods-border
        ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
      `}
      aria-label={config.displayName}
    >
      {isLoading ? 'Signing in...' : config.displayName}
    </Button>
  );
}