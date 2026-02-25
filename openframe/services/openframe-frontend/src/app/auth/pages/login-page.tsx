'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthLoginSection } from '@/app/auth/components/login-section';
import { useAuth } from '@/app/auth/hooks/use-auth';
import { AuthLayout } from '@/app/auth/layouts';
import { useAuthStore } from '@/app/auth/stores/auth-store';
import { isAuthOnlyMode } from '@/lib/app-mode';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    email,
    tenantInfo,
    hasDiscoveredTenants,
    discoveryAttempted,
    availableProviders,
    isLoading,
    isInitialized,
    loginWithSso: loginWithSso,
    discoverTenants,
  } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isAuthOnlyMode()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isInitialized) return;

    if (email && !discoveryAttempted && !isLoading) {
      discoverTenants(email);
    } else if (!email && !isLoading) {
      router.push('/auth');
    }
  }, [email, discoveryAttempted, isLoading, isInitialized, discoverTenants, router]);

  const handleSso = async (provider: string) => {
    await loginWithSso(provider);
  };

  const handleBack = () => {
    router.push('/auth/');
  };

  return (
    <AuthLayout>
      <AuthLoginSection
        email={email}
        tenantInfo={tenantInfo}
        hasDiscoveredTenants={hasDiscoveredTenants}
        availableProviders={availableProviders}
        onSso={handleSso}
        onBack={handleBack}
        isLoading={isLoading}
      />
    </AuthLayout>
  );
}
