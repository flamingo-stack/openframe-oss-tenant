'use client';

import { usePathname } from 'next/navigation';
import { AppLayout } from '../components/app-layout';

function getMainClassNameOverride(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  if (pathname.startsWith('/mingo')) return 'p-0 md:p-0';
  if (/^\/devices\/details\/[^/]+\/file-manager/.test(pathname)) return 'pb-0 md:pb-0';
  return undefined;
}

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mainClassNameOverride = getMainClassNameOverride(pathname);
  // Additional padding for widgets with absolute positioning at the bottom of the page, to prevent overlap with the app layout's fixed bottom bar
  return <AppLayout mainClassName={mainClassNameOverride || 'pb-14'}>{children}</AppLayout>;
}
