'use client';

import { usePathname } from 'next/navigation';
import { isRouteAllowedInCurrentMode } from '../lib/app-mode';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard component that handles route protection for static export
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();

  if (!isRouteAllowedInCurrentMode(pathname)) {
    return (
      <div className="min-h-screen bg-ods-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ods-text-primary mb-4">Access restricted</h1>
          <p className="text-ods-text-secondary">You don&apos;t have access to this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
