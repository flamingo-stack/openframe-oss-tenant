'use client';

import type { SubscriptionLockCopy } from './subscription-status';

interface TrialEndedBannerProps {
  lockCopy: SubscriptionLockCopy;
}

export function TrialEndedBanner({ lockCopy }: TrialEndedBannerProps) {
  return (
    <div className="flex flex-col gap-2 pt-6">
      <h1 className="text-h2 text-ods-text-primary">{lockCopy.title}</h1>
      <p className="text-h4 text-ods-text-secondary">{lockCopy.description}</p>
    </div>
  );
}
