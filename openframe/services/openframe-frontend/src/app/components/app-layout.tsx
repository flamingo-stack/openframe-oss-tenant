'use client';

import { AppLayout as CoreAppLayout } from '@flamingo-stack/openframe-frontend-core/components/navigation';
import { CompactPageLoader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { NavigationSidebarConfig } from '@flamingo-stack/openframe-frontend-core/types/navigation';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { runtimeEnv } from '@/lib/runtime-config';
import { getDefaultRedirectPath, isAuthOnlyMode, isOssTenantMode, isSaasTenantMode } from '../../lib/app-mode';
import { getNavigationItems } from '../../lib/navigation-config';
import { useAuth } from '../auth/hooks/use-auth';
import { useAuthStore } from '../auth/stores/auth-store';
import { AppShellSkeleton } from './app-shell-skeleton';
import { UnauthorizedOverlay } from './unauthorized-overlay';

function ContentLoading() {
  return <CompactPageLoader />;
}

function AppShell({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const user = useAuthStore(state => state.user);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push(getDefaultRedirectPath(false));
  }, [logout, router]);

  const navigationItems = useMemo(() => getNavigationItems(pathname), [pathname]);

  const sidebarConfig: NavigationSidebarConfig = useMemo(
    () => ({
      items: navigationItems,
      onNavigate: handleNavigate,
      className: 'h-screen',
    }),
    [navigationItems, handleNavigate],
  );

  const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  return (
    <CoreAppLayout
      mainClassName={mainClassName}
      sidebarConfig={sidebarConfig}
      loadingFallback={<ContentLoading />}
      mobileBurgerMenuProps={{
        user: {
          userName: displayName,
          userEmail: user?.email,
          userAvatarUrl: user?.image?.imageUrl || null,
          userRole: user?.role,
        },
        onLogout: handleLogout,
      }}
      headerProps={{
        showNotifications: false,
        showUser: true,
        userName: displayName,
        userEmail: user?.email,
        onProfile: () => router.push('/settings/?tab=profile'),
        onLogout: handleLogout,
      }}
    >
      {children}
    </CoreAppLayout>
  );
}

function AppLayoutInner({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  const { isAuthenticated } = useAuthStore();
  const { handleAuthenticationSuccess } = useAuth();
  const handleAuthSuccessRef = useRef(handleAuthenticationSuccess);
  useEffect(() => {
    handleAuthSuccessRef.current = handleAuthenticationSuccess;
  }, [handleAuthenticationSuccess]);
  const router = useRouter();
  const pathname = usePathname();

  const [isHydrated, setIsHydrated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      const store = useAuthStore as any;
      const persistState = store.persist?.hasHydrated?.();
      if (persistState !== undefined) {
        setIsHydrated(persistState);
      } else {
        setTimeout(() => setIsHydrated(true), 100);
      }
    };

    checkHydration();

    const store = useAuthStore as any;
    const unsubscribe = store.persist?.onFinishHydration?.(() => {
      setIsHydrated(true);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (isHydrated && isOssTenantMode() && !isAuthenticated && !pathname?.startsWith('/auth')) {
      router.push('/auth');
    }
  }, [isHydrated, isAuthenticated, pathname, router]);

  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!isSaasTenantMode()) return;
    if (isAuthenticated) return;
    if (hasCheckedAuth || isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsCheckingAuth(true);

    let cancelled = false;
    const check = async () => {
      try {
        const res = await apiClient.me();
        if (!cancelled && res.ok && (res as any).data?.authenticated) {
          const userData = (res as any).data.user;
          const token = runtimeEnv.enableDevTicketObserver()
            ? typeof window !== 'undefined'
              ? localStorage.getItem('of_access_token') || 'cookie-auth'
              : 'cookie-auth'
            : 'cookie-auth';

          handleAuthSuccessRef.current(token, userData);
        }
      } catch (_e) {
        // noop: if /me fails, we'll fall back to showing UnauthorizedOverlay
      } finally {
        if (!cancelled) {
          isCheckingRef.current = false;
          setIsCheckingAuth(false);
          setHasCheckedAuth(true);
        }
      }
    };

    const t = setTimeout(check, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isAuthenticated, hasCheckedAuth]);

  if (isOssTenantMode() && !isHydrated) {
    return <AppShellSkeleton />;
  }

  if (isAuthOnlyMode()) {
    return <>{children}</>;
  }

  if (isSaasTenantMode() && !isAuthenticated) {
    if (!hasCheckedAuth || isCheckingAuth) {
      return <AppShellSkeleton />;
    }
    return <UnauthorizedOverlay />;
  }

  if (isOssTenantMode() && isHydrated && !isAuthenticated) {
    return <AppShellSkeleton />;
  }

  return <AppShell mainClassName={mainClassName}>{children}</AppShell>;
}

export function AppLayout({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppLayoutInner mainClassName={mainClassName}>{children}</AppLayoutInner>
    </Suspense>
  );
}
