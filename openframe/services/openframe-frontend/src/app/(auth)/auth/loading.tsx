'use client';

import { AuthPageSkeleton } from './components/auth-page-skeleton';

/** Route-level loading state for /auth — the Create Organization step. */
export default function AuthLoading() {
  return <AuthPageSkeleton variant="create-organization" />;
}
