'use client';

import { AuthPageSkeleton } from '../components/auth-page-skeleton';

/** Route-level loading state for /auth/login. */
export default function LoginLoading() {
  return <AuthPageSkeleton variant="login" />;
}
