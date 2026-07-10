'use client';

import { Skeleton, Tag } from '@flamingo-stack/openframe-frontend-core';
import { AlertCircleIcon, PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ActionsMenuDropdown, PageError, SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/app/(auth)/auth/stores';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { useOnboardingMutations } from '@/graphql/onboarding/use-onboarding-mutations';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';

interface ProfileCardProps {
  onEditProfile: () => void;
  onVerifyEmail: () => void;
}

export function ProfileCard({ onEditProfile, onVerifyEmail }: ProfileCardProps) {
  const user = useAuthStore(state => state.user);
  const isLoadingProfile = useAuthStore(state => state.isLoadingProfile);

  // "Reset Onboarding" replays the personal Get Started tour — only offered when the
  // `new-onboarding` feature is on, same gate as the rest of the onboarding chrome.
  const newOnboardingEnabled = featureFlags.newOnboarding.enabled();
  const { resetUser, isMutating: isResettingOnboarding } = useOnboardingMutations();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '—';

  if (isLoadingProfile && !user) {
    return <Skeleton className="h-20 w-full rounded-md" />;
  }

  if (!user) {
    return <PageError message="No user data available" />;
  }

  return (
    <>
      <div className="flex items-center gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)]">
        <SquareAvatar
          src={getFullImageUrl(user.image?.imageUrl, user.image?.hash)}
          fallback={displayName}
          size="lg"
          variant="round"
        />

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-h4 text-ods-text-primary truncate" title={displayName}>
              {displayName}
            </span>
            {user.roles?.map(role => (
              <Tag key={role} variant="outline" label={role} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-h6 text-ods-text-secondary truncate" title={user.email}>
              {user.email}
            </p>
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

        {/* Action menu — Edit Profile + (flag-gated) Reset Onboarding, per the design's "…" kebab */}
        <div className="shrink-0 flex items-center gap-3">
          <ActionsMenuDropdown
            align="end"
            triggerAriaLabel="Profile actions"
            groups={[
              {
                items: [
                  {
                    id: 'edit-profile',
                    label: 'Edit Profile',
                    icon: <PenEditIcon className="w-5 h-5 text-ods-text-secondary" />,
                    onClick: onEditProfile,
                  },
                  ...(newOnboardingEnabled
                    ? [
                        {
                          id: 'reset-onboarding',
                          label: 'Reset Onboarding',
                          icon: <RotateCcw className="w-5 h-5 text-ods-text-secondary" />,
                          onClick: () => setIsResetConfirmOpen(true),
                          disabled: isResettingOnboarding,
                        },
                      ]
                    : []),
                ],
              },
            ]}
          />
        </div>
      </div>

      {/* Reset Onboarding confirmation */}
      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Reset onboarding"
        description="This replays your Get Started tour from the beginning. Your existing data isn't affected."
        confirmLabel="Reset Onboarding"
        cancelLabel="Cancel"
        variant="warning"
        isPending={isResettingOnboarding}
        pendingLabel="Resetting..."
        onConfirm={() => resetUser(() => setIsResetConfirmOpen(false))}
      />
    </>
  );
}
