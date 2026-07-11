'use client';

import { AuthPageSkeleton } from '../components/auth-page-skeleton';

/** Route-level loading state for /auth/invite — Accept Invitation (no tabs). */
export default function InviteLoading() {
  return <AuthPageSkeleton variant="complete-account" withTabs={false} />;
}
