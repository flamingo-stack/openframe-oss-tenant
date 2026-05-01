# Billing Module — Backend Requirements

Status of the billing/subscription UI versus the GraphQL schema (`schema.graphql`,
last fetched 2026-04-29 ~21:14 UTC).

The frontend now consumes everything the backend exposes. This document tracks
the remaining gaps where the UI either falls back to defaults, hardcodes data,
or follows an undocumented contract.

---

## 1. `aiConversations` counter — **MISSING from `SubscriptionUsage`**

`subscription.usage` exposes `devicesUsed`, `activeDevices`, `inactiveDevices`,
`aiTokensUsed` — but **not** `aiConversations`. The Billing & Usage page has an
"AI conversations" row in the Usage Overview section (per the trial-state Figma
spec, shown whenever `hasAi`) that currently displays `0` because the value is
hardcoded on the FE.

**Proposed**: add `aiConversations: Int!` to `SubscriptionUsage`:

```graphql
type SubscriptionUsage {
  devicesUsed: Int!
  activeDevices: Int!
  inactiveDevices: Int!
  aiTokensUsed: Int!
  aiConversations: Int!   # NEW
}
```

If conversations are not tracked / not meaningful, alternative is to confirm
this and we will drop the row from the UI.

---

## 2. Cancellation impact ("what you'll lose")

[`cancel-subscription-modal.tsx`](./components/cancel-subscription-modal.tsx)
shows a hardcoded `DEFAULT_STATS` block (47 scripts, 12 schedules, 3200 events,
8 monitoring policies, 142 tickets, 38 KB articles, 6 KB folders). These need
to come from the tenant.

**Proposed**:

```graphql
type Query {
  cancellationImpact: CancellationImpact!
}

type CancellationImpact {
  scripts: Int!
  activeSchedules: Int!
  events: Int!
  monitoringPolicies: Int!
  tickets: Int!
  kbArticles: Int!
  kbFolders: Int!
}
```

---

## 3. Reactivate / Renew flow — needs documented contract

UI shows "Renew Subscription" / "Reactivate Subscription" CTAs for `CANCELED`
and `PENDING_CANCELLATION` states. Today both route to
`/settings/billing-usage/subscription`, which then issues `updateSubscription`.
It is unclear whether `updateSubscription` reactivates a `CANCELED`
subscription, or whether a dedicated mutation is needed.

**Decision needed**: confirm one of:

- `updateSubscription` works for canceled → re-active transitions, **OR**
- Add `reactivateSubscription(input: ReactivateSubscriptionInput!): ReactivateSubscriptionResult!`.

Either way, document the contract in the schema description.

---

## 4. `updateSubscription` — explicit "needs payment" signal

The old contract returned `paymentUrl: String` to indicate the update created
an invoice the customer must pay immediately (e.g. an upgrade). That field was
removed.

The FE now redirects to the most recent
`subscription.pendingInvoices[*].hostedInvoiceUrl` after a successful update,
**but that is a heuristic** — `pendingInvoices` may include unrelated
historical invoices that just happen to be unpaid.

**Proposed** — add an explicit field on `UpdateSubscriptionResult`:

```graphql
type UpdateSubscriptionResult {
  subscription: SubscriptionDetail!
  errors: [UserError!]!
  """When non-null, the client should immediately redirect the user to pay this invoice."""
  paymentInvoice: PendingInvoice
}
```

---

## 5. Trial state in `SubscriptionStatus` — needs an explicit field

`SubscriptionStatus` enum is `ACTIVE | NOT_ACTIVATED | PAST_DUE | SUSPENDED |
PENDING_CANCELLATION | CANCELED` — there is no explicit `TRIAL` /
`TRIAL_EXPIRED`. Trial is implicit and observed via several different status
combinations in real backend data, so the FE has to derive it from a heuristic
rather than the typed status.

**Current FE rule** (see [`billing-usage-view.tsx`](./components/billing-usage-view.tsx)):

```
isTrial = trialExpirationDate != null
       && currentPeriodEnd == null
       && no product has any packageOptions or payAsYouGoOption
```

The lock screen ([`subscription-status.ts`](../../components/subscription-lock/subscription-status.ts))
uses a narrower rule that only fires for `status === NOT_ACTIVATED` so we don't
lock paid customers during cancellation.

**Proposed**: introduce an explicit FE-friendly contract. Either

- Add `TRIAL` / `TRIAL_EXPIRED` to `SubscriptionStatus` and have the backend
  transition the status field on the trial lifecycle, **OR**
- Add a derived field `subscription.isTrial: Boolean!` (and ideally
  `subscription.isTrialExpired: Boolean!`) computed by the backend so all
  clients agree on the rule.

Either way, document the canonical rule in the schema description.

---

## 5a. **DATA INTEGRITY** — invalid `PENDING_CANCELLATION` payloads observed

Real subscription payloads have been observed where:

- `subscription.status: "PENDING_CANCELLATION"` — but
- `subscription.cancellationEffectiveAt: null` — schema says this should be
  *"Non-null only for PENDING_CANCELLATION / CANCELED"*, so for this status it
  must be set
- `subscription.products[*].packageOptions[*].status: "PENDING_ACTIVATION"` —
  but a subscription that is cancelling shouldn't be activating new packages

Either the resolver or the underlying state machine permits inconsistent
combinations. The FE renders `Plan ends on —` for such payloads because there is
no date to display. Backend should either:

- Reject these combinations at the source (state machine invariant), or
- Always populate `cancellationEffectiveAt` for `PENDING_CANCELLATION` /
  `CANCELED` and exclude `PENDING_ACTIVATION` packages from a cancelling
  subscription.

---

## 6. `CancelSubscriptionInput.reason` — `String` vs enum

`cancelSubscription(input: CancelSubscriptionInput): Boolean!` accepts
`reason: String` and `description: String`. The UI sends a stable code
(`TOO_EXPENSIVE | NOT_USING_ENOUGH | MISSING_FEATURE | TECHNICAL_ISSUES |
OTHER`), but the schema only types it as `String`.

**Nice-to-have**: promote to an enum so the contract is self-documenting and
backend-validated:

```graphql
enum CancellationReason {
  TOO_EXPENSIVE
  NOT_USING_ENOUGH
  MISSING_FEATURE
  TECHNICAL_ISSUES
  OTHER
}

input CancelSubscriptionInput {
  reason: CancellationReason
  description: String
}
```

---

## 7. Payment-method management

Schema exposes `detachPaymentMethods: Int!` but no way to **list**, **add**,
or **set default** payment methods. The lock screen for `PAST_DUE` says
"Update your payment method" but the UI has nowhere to send the user.

**Proposed**:

```graphql
type Query {
  paymentMethods: [PaymentMethod!]!
}

type PaymentMethod {
  id: ID!
  brand: String!         # "visa", "mastercard", ...
  last4: String!
  expMonth: Int!
  expYear: Int!
  isDefault: Boolean!
}

type Mutation {
  """Returns a Stripe SetupIntent client secret for the FE to confirm a new card."""
  createPaymentMethodSetup: PaymentMethodSetup!

  setDefaultPaymentMethod(id: ID!): PaymentMethod!
  detachPaymentMethod(id: ID!): Boolean!
}

type PaymentMethodSetup {
  setupIntentClientSecret: String!
}
```

`detachPaymentMethods` (plural, no args) should be marked `@deprecated` once
`detachPaymentMethod(id)` lands.

---

## 8. Discount-code application in the subscription form — FE only

Backend supports it (`UpdateSubscriptionInput.discountCode`,
`validateDiscount(code)`, `SubscriptionDetail.discounts`). UI has no input
field today — **frontend work, not blocked by the backend**. Listed here only
so the gap is visible; remove this item once the FE input ships.

---

## Status summary

| Capability | Backend | Frontend |
|---|---|---|
| Subscription products/options/PAYG | ✅ | ✅ wired |
| Subscription status (typed enum) | ✅ | ✅ wired |
| Trial state | ⚠️ implicit (derived rule) | ✅ FE-derived `TRIAL_EXPIRED` |
| Update subscription (typed errors) | ✅ | ✅ wired |
| Update→payment redirect signal | ⚠️ heuristic (latest pendingInvoice) | ⚠️ heuristic |
| Cancel subscription with reason+description | ✅ (`String`, not enum) | ✅ wired |
| Past-due / overdue state | ✅ `status` + `pendingInvoices` | ✅ wired |
| Pay overage CTA → Stripe `hostedInvoiceUrl` | ✅ | ✅ wired |
| Cancelled / pending-cancellation state | ✅ `status` + `cancellationEffectiveAt` | ✅ wired |
| Real usage counters (devices / AI tokens) | ✅ `subscription.usage` | ✅ wired |
| AI conversations counter | ❌ | ❌ shows 0 (hardcoded) |
| Estimated overage cost | ✅ `currentInvoice.estimatedOverage` | ✅ wired |
| AI model rates table | ✅ `aiModelRates` | ✅ wired |
| Cancellation impact stats | ❌ | ❌ hardcoded |
| Reactivate flow | ⚠️ unclear | ⚠️ assumes `updateSubscription` |
| Payment-method management | ❌ (only detach-all) | ❌ no UI |
| Discount-code input | ✅ | ❌ no UI (FE work) |
