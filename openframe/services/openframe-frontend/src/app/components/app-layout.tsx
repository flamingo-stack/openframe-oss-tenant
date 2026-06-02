'use client';

import {
  AppLayoutDrawer,
  AppLayoutDrawerContent,
  AppLayout as CoreAppLayout,
} from '@flamingo-stack/openframe-frontend-core/components/navigation';
import { CompactPageLoader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { NavigationSidebarConfig } from '@flamingo-stack/openframe-frontend-core/types/navigation';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/app/(auth)/auth/hooks/use-auth-session';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { performLogout } from '@/app/(auth)/auth/utils/auth-actions';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { isAuthOnlyMode, isOssTenantMode, isSaasTenantMode } from '../../lib/app-mode';
import { getNavigationItems } from '../../lib/navigation-config';
import { AppShellSkeleton } from './app-shell-skeleton';
import { OpenframeEmbeddableChatEntry } from './openframe-embeddable-chat-entry';
import { SubscriptionGuard } from './subscription-lock/subscription-guard';
import { SubscriptionLockContent } from './subscription-lock/subscription-lock-content';
import { useSubscriptionLock } from './subscription-lock/subscription-lock-context';
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

  // Mingo chat open state — shared between the header trigger below and the
  // in-layout `AppLayoutDrawer` + `OpenframeEmbeddableChatEntry` in the
  // `drawer` slot. The chat runs shell-less inside the drawer, so the drawer
  // (not the chat) owns the panel chrome.
  const [chatOpen, setChatOpen] = useState(false);

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

  // Toggle the Mingo chat drawer from the header's "Mingo AI" launcher.
  const toggleChat = useCallback(() => setChatOpen(prev => !prev), []);

  const { isLocked } = useSubscriptionLock();
  // Checkout result pages render their own success/cancel UI; they're the only
  // place a paying user lands before the webhook flips the subscription to ACTIVE.
  const isCheckoutResultPage = pathname?.startsWith('/checkout') ?? false;
  const showLockContent = isLocked && !isCheckoutResultPage;
  // The Mingo sidebar (header launcher + in-layout chat drawer) is gated by the
  // `mingo-sidebar` feature flag. It's also only meaningful inside the full,
  // unlocked app shell (it hits authed endpoints), so the subscription lock
  // suppresses both the launcher and the drawer regardless of the flag.
  const chatEnabled = featureFlags.mingoSidebar.enabled() && !showLockContent;
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

  const notificationsEnabled = featureFlags.notifications.enabled();

  const headerProps = useMemo(
    () => ({
      showNotifications: notificationsEnabled,
      showUser: true,
      userName: displayName,
      userEmail,
      userAvatarUrl: avatarUrl,
      onProfile: handleProfile,
      onLogout: handleLogout,
      // These three are core `AppHeader` prop names (the "AI" digraph trips
      // biome's strictCase camelCase rule); they're external API, not ours.
      // biome-ignore lint/style/useNamingConvention: external lib prop name
      showMingoAI: chatEnabled,
      // biome-ignore lint/style/useNamingConvention: external lib prop name
      onMingoAI: toggleChat,
      // biome-ignore lint/style/useNamingConvention: external lib prop name
      isMingoAIActive: chatOpen,
    }),
    [
      notificationsEnabled,
      displayName,
      userEmail,
      avatarUrl,
      handleProfile,
      handleLogout,
      chatEnabled,
      toggleChat,
      chatOpen,
    ],
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

  const chatDrawer = chatEnabled ? (
    <AppLayoutDrawer open={chatOpen} onOpenChange={setChatOpen}>
      <AppLayoutDrawerContent
        side="right"
        flush
        resizable
        minSize={480}
        defaultSize={640}
        storageKey="openframe:mingo-chat-width"
        panelClassName="!bg-ods-bg"
        debugLayoutShift
      >
        {/* No AppLayoutDrawerHeader/Title — EmbeddableChat renders its own
            header + X button; a wrapper header would double it up. */}
        <OpenframeEmbeddableChatEntry open={chatOpen} onOpenChange={setChatOpen} />
      </AppLayoutDrawerContent>
    </AppLayoutDrawer>
  ) : null;

  return (
    <CoreAppLayout
      mainClassName={mainClassName ?? 'pb-20 md:pb-20'}
      sidebarConfig={sidebarConfig}
      loadingFallback={<ContentLoading />}
      mobileBurgerMenuProps={mobileBurgerMenuProps}
      headerProps={headerProps}
      disabled={showLockContent}
      drawer={chatDrawer}
    >
      {showLockContent ? <SubscriptionLockContent /> : children}
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

  return (
    <SubscriptionGuard fallback={<AppShellSkeleton />}>
      <AppShell mainClassName={mainClassName}>{children}</AppShell>
    </SubscriptionGuard>
  );
}

export function AppLayout({ children, mainClassName }: { children: React.ReactNode; mainClassName?: string }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AppLayoutInner mainClassName={mainClassName}>{children}</AppLayoutInner>
    </Suspense>
  );
}
