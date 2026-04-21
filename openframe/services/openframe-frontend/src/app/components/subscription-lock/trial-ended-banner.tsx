'use client';

import type { SubscriptionLockCopy } from './subscription-status';

interface TrialEndedBannerProps {
  copy: SubscriptionLockCopy;
}

export function TrialEndedBanner({ copy }: TrialEndedBannerProps) {
  return (
    <div className="flex flex-col gap-2 pt-6">
      <h1 className="text-h2 text-ods-text-primary">{copy.title}</h1>
      <p className="text-h4 text-ods-text-secondary">{copy.description}</p>
    </div>
  );
}
