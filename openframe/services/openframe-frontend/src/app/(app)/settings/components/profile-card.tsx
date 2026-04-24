'use client';

import { Button, Skeleton, Tag } from '@flamingo-stack/openframe-frontend-core';
import { AlertCircleIcon, PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageError, SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useAuthStore } from '@/app/(auth)/auth/stores';
import { getFullImageUrl } from '@/lib/image-url';

interface ProfileCardProps {
  onEditProfile: () => void;
  onVerifyEmail: () => void;
}

export function ProfileCard({ onEditProfile, onVerifyEmail }: ProfileCardProps) {
  const user = useAuthStore(state => state.user);
  const isLoadingProfile = useAuthStore(state => state.isLoadingProfile);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '—';

  if (isLoadingProfile && !user) {
    return <Skeleton className="h-20 w-full rounded-md" />;
  }

  if (!user) {
    return <PageError message="No user data available" />;
  }

  return (
    <div className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-m)] flex items-center gap-[var(--spacing-system-m)]">
      <SquareAvatar src={getFullImageUrl(user.image?.imageUrl)} fallback={displayName} size="lg" variant="round" />

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="text-h4 text-ods-text-primary truncate">{displayName}</span>
          {user.roles?.map(role => (
            <Tag key={role} variant="outline" label={role} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-h6 text-ods-text-secondary truncate">{user.email}</p>
          {user.emailVerified === false && (
            <button
              type="button"
              onClick={onVerifyEmail}
              className="flex items-center gap-1 text-ods-warning hover:text-ods-warning/80 transition-colors"
              title="Email not verified - click to resend verification"
            >
              <AlertCircleIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Not verified</span>
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onEditProfile}
          leftIcon={<PenEditIcon className="w-5 h-5 text-ods-text-secondary" />}
        >
          Edit Profile
        </Button>
      </div>
    </div>
  );
}
