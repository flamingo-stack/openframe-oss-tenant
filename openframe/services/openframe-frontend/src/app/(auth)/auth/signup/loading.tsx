'use client';

import { AuthPageSkeleton } from '../components/auth-page-skeleton';

/** Route-level loading state for /auth/signup — Complete your Account (incl. SSO shortcuts). */
export default function SignupLoading() {
  return <AuthPageSkeleton variant="complete-account" />;
}
