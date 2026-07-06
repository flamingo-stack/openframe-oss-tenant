'use client';

import { usePathname } from 'next/navigation';
import { AppLayout } from '../components/app-layout';
import { OpenframeChatRuntimeProvider } from '../components/openframe-chat-runtime-provider';

function getMainClassNameOverride(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  if (pathname.startsWith('/mingo')) return 'p-0 md:p-0';
  if (pathname.startsWith('/devices/details/file-manager')) return 'pb-0 md:pb-0';
  if (pathname.startsWith('/tickets')) return 'pb-0 md:pb-0';
  if (pathname.startsWith('/settings')) return 'pb-0 md:pb-0';
  return undefined;
}

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainClassNameOverride = getMainClassNameOverride(pathname);
  // EmbeddableChat now lives inside the app shell as an in-layout
  // `AppLayoutDrawer` (see `AppShell` in `components/app-layout.tsx`): it
  // occupies only the main content area, leaving the header and sidebar
  // visible and interactive, and is opened from a header trigger instead of a
  // body-level floating "Ask AI" button. This provider still supplies the
  // `ChatRuntime` context the chat consumes. Hosts both Guide (SSE → MPH via
  // /guide proxy) and Mingo (NATS → openframe backend) modes side-by-side
  // with an in-panel toggle. The existing `/mingo` route stays untouched
  // during the migration — both surfaces coexist until validation is done.
  return (
    <OpenframeChatRuntimeProvider>
      <AppLayout mainClassName={mainClassNameOverride || 'pb-14'}>{children}</AppLayout>
    </OpenframeChatRuntimeProvider>
  );
}
