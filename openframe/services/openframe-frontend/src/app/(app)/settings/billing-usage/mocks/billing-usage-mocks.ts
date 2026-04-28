/**
 * Billing & Usage mock states for previewing the page without real data.
 * Activated via the `?mock=<key>` query param on /settings/billing-usage.
 *
 * Shape matches `billingUsageViewQuery$data['subscription']` plus the additional
 * usage counters that will come from `subscription.usage` once backend exposes them.
 */

import type {
  BillingPeriod,
  OpenframeProduct,
  SubscriptionProductStatus,
} from '@/__generated__/billingUsageViewQuery.graphql';

interface MockPackageOption {
  readonly id: string | null | undefined;
  readonly billingPeriod: BillingPeriod | null | undefined;
  readonly quantity: number | null | undefined;
  readonly price: number | null | undefined;
  readonly status: SubscriptionProductStatus | null | undefined;
  readonly endDate: string | null | undefined;
}

interface MockPaygOption {
  readonly id: string | null | undefined;
  readonly price: number | null | undefined;
}

interface MockProduct {
  readonly name: OpenframeProduct;
  readonly packageOptions: readonly MockPackageOption[];
  readonly payAsYouGoOption: MockPaygOption | null | undefined;
}

export interface BillingUsageMock {
  readonly subscription: {
    readonly id: string;
    readonly endDate: string | null | undefined;
    readonly products: readonly MockProduct[];
  } | null;
  readonly usage: {
    readonly devicesUsed: number;
    readonly activeDevices: number;
    readonly inactiveDevices: number;
    readonly aiUsed: number;
    readonly aiConversations: number;
    /** Estimated overage charge for current billing period (USD). */
    readonly estimatedOverageCost?: number;
    /** Overage payment is past due — renders the page in error (red) state with a "Pay Overage" CTA. */
    readonly overdue?: boolean;
    /** Subscription is cancelled — renders "Plan ends on" instead of "Next Billing" and a "Renew Subscription" CTA. */
    readonly cancelled?: boolean;
  };
}

const FULL: BillingUsageMock = {
  subscription: {
    id: 'sub_mock_full',
    endDate: '2026-12-15',
    products: [
      {
        name: 'MANAGED_DEVICES',
        packageOptions: [
          {
            id: 'pkg_devices_500',
            billingPeriod: 'MONTHLY',
            quantity: 500,
            price: 2125,
            status: 'ACTIVE',
            endDate: '2026-12-15',
          },
        ],
        payAsYouGoOption: null,
      },
      {
        name: 'AI_ASSISTANCE',
        packageOptions: [
          {
            id: 'pkg_ai_500k',
            billingPeriod: 'MONTHLY',
            quantity: 500_000,
            price: 2500,
            status: 'ACTIVE',
            endDate: '2026-12-15',
          },
        ],
        payAsYouGoOption: null,
      },
    ],
  },
  usage: {
    devicesUsed: 1,
    activeDevices: 1,
    inactiveDevices: 0,
    aiUsed: 0,
    aiConversations: 0,
  },
};

const DEVICE_ONLY: BillingUsageMock = {
  subscription: {
    id: 'sub_mock_device_only',
    endDate: '2026-12-15',
    products: [
      {
        name: 'MANAGED_DEVICES',
        packageOptions: [
          {
            id: 'pkg_devices_500',
            billingPeriod: 'MONTHLY',
            quantity: 500,
            price: 2125,
            status: 'ACTIVE',
            endDate: '2026-12-15',
          },
        ],
        payAsYouGoOption: null,
      },
    ],
  },
  usage: {
    devicesUsed: 1,
    activeDevices: 1,
    inactiveDevices: 0,
    aiUsed: 0,
    aiConversations: 0,
  },
};

const WARNING_FULL: BillingUsageMock = {
  subscription: FULL.subscription,
  usage: {
    devicesUsed: 485,
    activeDevices: 475,
    inactiveDevices: 10,
    aiUsed: 495_208,
    aiConversations: 1_847,
  },
};

const WARNING_DEVICE_ONLY: BillingUsageMock = {
  subscription: DEVICE_ONLY.subscription,
  usage: {
    devicesUsed: 485,
    activeDevices: 475,
    inactiveDevices: 10,
    aiUsed: 0,
    aiConversations: 0,
  },
};

const OVER_FULL: BillingUsageMock = {
  subscription: FULL.subscription,
  usage: {
    devicesUsed: 520,
    activeDevices: 516,
    inactiveDevices: 7,
    aiUsed: 635_119,
    aiConversations: 1_847,
    estimatedOverageCost: 107.7,
  },
};

const OVER_DEVICE_ONLY: BillingUsageMock = {
  subscription: DEVICE_ONLY.subscription,
  usage: {
    devicesUsed: 520,
    activeDevices: 516,
    inactiveDevices: 7,
    aiUsed: 0,
    aiConversations: 0,
    estimatedOverageCost: 50,
  },
};

const OVER_AI_ONLY: BillingUsageMock = {
  subscription: FULL.subscription,
  usage: {
    devicesUsed: 350,
    activeDevices: 516,
    inactiveDevices: 7,
    aiUsed: 635_119,
    aiConversations: 1_847,
    estimatedOverageCost: 107.7,
  },
};

const OVER_DEVICE_ONLY_FULL: BillingUsageMock = {
  subscription: FULL.subscription,
  usage: {
    devicesUsed: 520,
    activeDevices: 516,
    inactiveDevices: 7,
    aiUsed: 192_726,
    aiConversations: 1_847,
    estimatedOverageCost: 50,
  },
};

const PAYG_FULL: BillingUsageMock = {
  subscription: {
    id: 'sub_mock_payg',
    endDate: '2026-12-15',
    products: [
      {
        name: 'MANAGED_DEVICES',
        packageOptions: [],
        payAsYouGoOption: { id: 'payg_devices', price: 5 },
      },
      {
        name: 'AI_ASSISTANCE',
        packageOptions: [],
        payAsYouGoOption: { id: 'payg_ai', price: 0.000008 },
      },
    ],
  },
  usage: {
    devicesUsed: 350,
    activeDevices: 234,
    inactiveDevices: 13,
    aiUsed: 192_726,
    aiConversations: 1_847,
    estimatedOverageCost: 4625,
  },
};

const CANCELLED_FULL: BillingUsageMock = {
  subscription: FULL.subscription,
  usage: {
    devicesUsed: 350,
    activeDevices: 234,
    inactiveDevices: 13,
    aiUsed: 192_726,
    aiConversations: 1_847,
    cancelled: true,
  },
};

const OVERDUE_FULL: BillingUsageMock = {
  subscription: FULL.subscription,
  usage: { ...OVER_FULL.usage, overdue: true },
};

const OVERDUE_DEVICE_ONLY: BillingUsageMock = {
  subscription: DEVICE_ONLY.subscription,
  usage: { ...OVER_DEVICE_ONLY.usage, overdue: true },
};

export const BILLING_USAGE_MOCKS = {
  full: FULL,
  'device-only': DEVICE_ONLY,
  'warning-full': WARNING_FULL,
  'warning-device-only': WARNING_DEVICE_ONLY,
  'over-full': OVER_FULL,
  'over-device-only': OVER_DEVICE_ONLY,
  'over-ai-only': OVER_AI_ONLY,
  'over-device-only-full': OVER_DEVICE_ONLY_FULL,
  'payg-full': PAYG_FULL,
  'cancelled-full': CANCELLED_FULL,
  'overdue-full': OVERDUE_FULL,
  'overdue-device-only': OVERDUE_DEVICE_ONLY,
} as const;

export type BillingUsageMockKey = keyof typeof BILLING_USAGE_MOCKS;

export function isBillingUsageMockKey(value: string | null): value is BillingUsageMockKey {
  return value !== null && value in BILLING_USAGE_MOCKS;
}
