'use client';

import { ChatIdentityProvider } from '@flamingo-stack/openframe-frontend-core/components/chat';
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
import { type UnreadCountsByCategory, UnreadCountsHydrator } from './notifications/unread-counts-hydrator';
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
  const userImageHash = useAuthStore(state => state.user?.image?.hash);

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

  // Close the drawer on route navigation. The drawer is non-modal (header +
  // sidebar stay interactive while it's open), so clicking a nav link or an
  // in-chat link that routes should land the user on the new page rather than
  // leaving the panel covering it. The lib's EmbeddableChat leaves this
  // pathname-driven close to the embedder (it has no router), so we own it
  // here. Runs on `pathname` change; the initial no-op (already closed) is
  // harmless — React bails on a same-value `setState`.
  useEffect(() => {
    setChatOpen(false);
  }, [pathname]);

  const { isLocked } = useSubscriptionLock();
  // Checkout result pages render their own success/cancel UI; they're the only
  // place a paying user lands before the webhook flips the subscription to ACTIVE.
  const isCheckoutResultPage = pathname?.startsWith('/checkout') ?? false;
  const showLockContent = isLocked && !isCheckoutResultPage;
  // The Mingo sidebar (header launcher + in-layout chat drawer) is gated by the
  // `mingo-sidebar` feature flag. It's also only meaningful inside the full,
  // unlocked app shell (it hits authed endpoints), so the subscription lock
  // suppresses both the launcher and the drawer regardless of the flag.
  //
  // Suppressed on the legacy `/mingo` route: that page is itself a full Mingo
  // chat and shares the same global `mingo-messages-store`. Mounting the drawer
  // there too means two surfaces fight over `activeDialogId` — e.g. the page's
  // URL→store sync immediately re-selects the dialog the drawer's Back button
  // just cleared, so Back appears to do nothing. The drawer is the replacement
  // for that page, so they should never be live at the same time.
  const isMingoPage = pathname?.startsWith('/mingo') ?? false;
  const chatEnabled = featureFlags.mingoSidebar.enabled() && !showLockContent && !isMingoPage;
  const [unreadCounts, setUnreadCounts] = useState<UnreadCountsByCategory>({});
  const navigationItems = useMemo(() => getNavigationItems(pathname, unreadCounts), [pathname, unreadCounts]);

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

  const avatarUrl = useMemo(() => getFullImageUrl(userImageUrl, userImageHash), [userImageUrl, userImageHash]);

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
    // ChatIdentityProvider wraps the drawer (not the remounting panel content)
    // so chat identity resolves ONCE for the session and survives the drawer
    // closing/reopening. Without it, EmbeddableChat self-fetches identity on
    // every open (the panel unmounts on close). Must sit inside the chat
    // runtime context (provided higher up by OpenframeChatRuntimeProvider).
    <ChatIdentityProvider>
      <AppLayoutDrawer open={chatOpen} onOpenChange={setChatOpen}>
        <AppLayoutDrawerContent
          side="right"
          flush
          resizable
          minSize={480}
          defaultSize={640}
          storageKey="openframe:mingo-chat-width"
          panelClassName="!bg-ods-bg"
        >
          {/* No AppLayoutDrawerHeader/Title — EmbeddableChat renders its own
              header + X button; a wrapper header would double it up. */}
          <OpenframeEmbeddableChatEntry open={chatOpen} onOpenChange={setChatOpen} />
        </AppLayoutDrawerContent>
      </AppLayoutDrawer>
    </ChatIdentityProvider>
  ) : null;

  return (
    <>
      {notificationsEnabled && (
        <Suspense fallback={null}>
          <UnreadCountsHydrator onChange={setUnreadCounts} />
        </Suspense>
      )}
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
    </>
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
