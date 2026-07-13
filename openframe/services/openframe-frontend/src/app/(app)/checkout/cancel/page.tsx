'use client';

import { XCircle } from 'lucide-react';
import { routes } from '@/lib/routes';
import { CheckoutResultCard } from '../components/checkout-result-card';

export default function CheckoutCancelPage() {
  return (
    <CheckoutResultCard
      icon={XCircle}
      iconWrapperClassName="bg-ods-error-secondary text-ods-error"
      title="Payment Cancelled"
      description="No charges were made. You can pick a plan whenever you're ready."
      primaryCta={{ label: 'Back to Plans', href: routes.settings.billingSubscription }}
      secondaryCta={{ label: 'Go to Dashboard', href: routes.dashboard }}
    />
  );
}
