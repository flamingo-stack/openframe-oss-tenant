'use client';

import { AppLayout as CoreAppLayout } from '@flamingo-stack/openframe-frontend-core/components/navigation';
import { CompactPageLoader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { NavigationSidebarConfig } from '@flamingo-stack/openframe-frontend-core/types/navigation';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import { isAuthOnlyMode, isOssTenantMode, isSaasTenantMode } from '../../lib/app-mode';
import { getNavigationItems } from '../../lib/navigation-config';
import { useAuthSession } from '../auth/hooks/use-auth-session';
import { useAuthStore } from '../auth/stores/auth-store';
import { performLogout } from '../auth/utils/auth-actions';
import { AppShellSkeleton } from './app-shell-skeleton';
import { UnauthorizedOverlay } from './unauthorized-overlay';

function ContentLoading() {
  return <CompactPageLoader />;
}

function AppShell({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const userFirstName = useAuthStore(state => state.user?.firstName);
  const userLastName = useAuthStore(state => state.user?.lastName);
  const userEmail = useAuthStore(state => state.user?.email);
  const userRole = useAuthStore(state => state.user?.role);
  const userImageUrl = useAuthStore(state => state.user?.image?.imageUrl);

  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const handleLogout = useCallback(() => {
    performLogout();
  }, []);

  const handleProfile = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const navigationItems = useMemo(() => getNavigationItems(pathname), [pathname]);

  const sidebarConfig: NavigationSidebarConfig = useMemo(
    () => ({
      items: navigationItems,
      onNavigate: handleNavigate,
      className: 'h-screen',
    }),
    [navigationItems, handleNavigate],
  );

  const displayName = useMemo(
    () => `${userFirstName || ''} ${userLastName || ''}`.trim(),
    [userFirstName, userLastName],
  );

  const avatarUrl = useMemo(() => getFullImageUrl(userImageUrl), [userImageUrl]);

  const headerProps = useMemo(
    () => ({
      showNotifications: false,
      showUser: true,
      userName: displayName,
      userEmail,
      userAvatarUrl: avatarUrl,
      onProfile: handleProfile,
      onLogout: handleLogout,
    }),
    [displayName, userEmail, avatarUrl, handleProfile, handleLogout],
  );

  const mobileBurgerMenuProps = useMemo(
    () => ({
      user: {
        userName: displayName,
        userEmail,
        userAvatarUrl: avatarUrl || null,
        userRole,
      },
      onLogout: handleLogout,
    }),
    [displayName, userEmail, avatarUrl, userRole, handleLogout],
  );

  return (
    <CoreAppLayout
      mainClassName={cn('pb-20 md:pb-20', mainClassName)}
      sidebarConfig={sidebarConfig}
      loadingFallback={<ContentLoading />}
      mobileBurgerMenuProps={mobileBurgerMenuProps}
      headerProps={headerProps}
    >
      {children}
    </CoreAppLayout>
  );
}

function AppLayoutInner({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  const { isReady, isAuthenticated } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated users to auth page in OSS mode
  useEffect(() => {
    if (isReady && isOssTenantMode() && !isAuthenticated && !pathname?.startsWith('/auth')) {
      router.push('/auth');
    }
  }, [isReady, isAuthenticated, pathname, router]);

  // Still loading initial auth check
  if (!isReady) {
    return <AppShellSkeleton />;
  }

  // Auth-only mode (saas-shared): render children directly
  if (isAuthOnlyMode()) {
    return <>{children}</>;
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (isSaasTenantMode()) {
      return <UnauthorizedOverlay />;
    }
    // OSS mode - show skeleton while redirecting to /auth
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
