# Onboarding Walkthrough Implementation Guide

## Overview

The onboarding walkthrough system provides a generic, reusable component for guiding users through initial setup steps. Built with local storage state management, it's ready for future server-side integration.

## Components Created

### 1. `useOnboardingState` Hook
**Location:** `ui-kit/src/hooks/ui/use-onboarding-state.ts`

Custom hook for managing onboarding state with localStorage persistence.

**Features:**
- Track completed and skipped steps
- Persistent state across page refreshes
- Dismissal state management
- Type-safe API

**API:**
```typescript
const {
  state,              // Current onboarding state
  markComplete,       // Mark step as completed
  markSkipped,        // Mark step as skipped
  dismissOnboarding,  // Dismiss entire onboarding
  isStepComplete,     // Check if step is complete
  isStepSkipped,      // Check if step is skipped
  allStepsComplete    // Check if all steps done
} = useOnboardingState('storage-key')
```

### 2. `OnboardingStepCard` Component
**Location:** `ui-kit/src/components/shared/onboarding/onboarding-step-card.tsx`

Individual step card with dynamic state-based rendering, extends `InteractiveCard` for consistent hover behavior.

**Architecture:**
- **Extends:** `InteractiveCard` component for hover effects and click handling
- **Benefits:** Consistent hover behavior, automatic accent color transitions, group hover support
- **Click Modes:** Button-only (default) or full-card clickable

**Visual States:**
- **Incomplete:** Displays "Skip Step" (outline) + Action button (yellow)
- **Completed:** Displays "COMPLETED" badge (green) + Management button (outline)

**Props:**
```typescript
interface OnboardingStepCardProps {
  step: OnboardingStepConfig
  isCompleted: boolean
  onAction: () => void | Promise<void>
  onSkip: () => void
  className?: string
  clickable?: boolean  // Enable click-to-navigate on card (default: false)
}
```

**Design Specifications:**
- Fixed height: `80px`
- Yellow action button: `bg-[var(--ods-open-yellow-base)]`
- Success badge: `StatusBadge` with `colorScheme="success"`
- Button height: `32px`
- Spacing: `gap-4` between columns
- Hover effects: Border and title color change via InteractiveCard

### 3. `OnboardingWalkthrough` Component
**Location:** `ui-kit/src/components/shared/onboarding/onboarding-walkthrough.tsx`

Main orchestrator component that manages the entire onboarding flow.

**Features:**
- Dynamic header text: "Get Started:"
- Dismiss button: "Skip Onboarding" (outline) or "Close Onboarding" (yellow when all complete)
- Card container with configurable spacing
- Automatic state persistence
- Optional dashboard content below

**Props:**
```typescript
interface OnboardingWalkthroughProps {
  steps: OnboardingStepConfig[]          // Array of step configurations
  onDismiss?: () => void                  // Callback when dismissed
  storageKey?: string                     // localStorage key (default: 'openframe-onboarding-state')
  className?: string                      // Container classes
  cardClassName?: string                  // Card container classes
  spacing?: string                        // Gap between cards (default: 'gap-6')
  showDashboardBelow?: boolean           // Show content below (default: true)
}
```

## Type Definitions

### OnboardingStepConfig
```typescript
interface OnboardingStepConfig {
  id: string                              // Unique identifier for tracking
  title: string                           // Step title
  description: string                     // Step description
  actionIcon: React.ReactNode             // Icon for action button
  actionText: string                      // Text for incomplete state (e.g., "Setup SSO")
  completedText: string                   // Text for completed state (e.g., "SSO Configurations")
  onAction: () => void | Promise<void>    // Action handler (navigation, API calls)
  onSkip?: () => void                     // Optional skip handler
}
```

### OnboardingState
```typescript
interface OnboardingState {
  completedSteps: string[]                // Array of completed step IDs
  skippedSteps: string[]                  // Array of skipped step IDs
  dismissed: boolean                      // Onboarding dismissal status
  lastUpdated: string                     // ISO timestamp of last update
}
```

## Usage Example

### Dashboard Integration

```typescript
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWalkthrough, type OnboardingStepConfig } from '@flamingo/ui-kit'
import { KeyRound, Building2, Monitor, Users, BookOpen } from 'lucide-react'

export function DashboardPage() {
  const router = useRouter()

  const onboardingSteps: OnboardingStepConfig[] = [
    {
      id: 'sso-configuration',
      title: 'SSO Configuration',
      description: 'Link Microsoft 365, Google Workspace, and other identity providers',
      actionIcon: <KeyRound className="h-5 w-5" />,
      actionText: 'Setup SSO',
      completedText: 'SSO Configurations',
      onAction: async () => {
        router.push('/settings/sso')
      }
    },
    {
      id: 'organizations-setup',
      title: 'Organizations Setup',
      description: 'Create and configure your organizational structure',
      actionIcon: <Building2 className="h-5 w-5" />,
      actionText: 'Add Organization',
      completedText: 'Manage Organizations',
      onAction: async () => {
        router.push('/organizations')
      }
    },
    // ... more steps
  ]

  return (
    <div className="space-y-10">
      {/* Onboarding section */}
      <OnboardingWalkthrough
        steps={onboardingSteps}
        storageKey="openframe-onboarding-state"
        spacing="gap-6"
        onDismiss={() => {
          console.log('Onboarding dismissed')
        }}
      />

      {/* Dashboard content below */}
      <DevicesOverviewSection />
      <OrganizationsOverviewSection />
    </div>
  )
}
```

## Design Tokens

All styling uses ODS design tokens for consistency:

```typescript
// Colors
--ods-card                          // Card background
--ods-border                        // Border colors
--ods-text-primary                  // Primary text
--ods-text-secondary                // Secondary text
--ods-accent                        // Accent color (yellow)
--ods-open-yellow-base              // Yellow button background
--ods-open-yellow-hover             // Yellow button hover
--ods-attention-green-success       // Success badge text
--ods-attention-green-success-secondary  // Success badge background

// Typography
font-['DM_Sans']                    // Button and body text
font-['Azeret_Mono']                // Headers

// Spacing
gap-6                               // Default card spacing (24px)
h-[80px]                            // Card height
h-[32px]                            // Button/badge height
h-[40px]                            // Header button height
```

## State Management

### LocalStorage Structure
```json
{
  "completedSteps": ["sso-configuration", "organizations-setup"],
  "skippedSteps": ["knowledge-base"],
  "dismissed": false,
  "lastUpdated": "2025-01-21T10:30:00.000Z"
}
```

### State Flow

1. **Initial Load:**
   - Hook reads from localStorage
   - If no state found, uses default (empty arrays)
   - All steps show as incomplete

2. **User Interaction:**
   - Click action button → Execute `onAction()` → Mark step complete
   - Click skip button → Execute `onSkip()` (optional) → Mark step skipped
   - Click dismiss → Set `dismissed: true` → Hide onboarding

3. **State Persistence:**
   - Every state change automatically saves to localStorage
   - Cross-tab sync via storage events (handled by `useLocalStorage`)
   - Timestamps track last update

### Server-Side Migration (Future)

The system is architected for easy migration to server-side state:

```typescript
// Current: Local storage only
const { state, markComplete } = useOnboardingState('key')

// Future: Server-side with local storage fallback
const { state, markComplete } = useOnboardingState('key', {
  syncToServer: true,
  userId: currentUser.id,
  onSyncError: (error) => console.error(error)
})
```

**Server-Side Implementation Plan:**

1. **Create MongoDB Model:**
```java
@Document(collection = "user_onboarding_state")
public class UserOnboardingState {
    @Id private String id;
    private String userId;
    private List<String> completedSteps;
    private List<String> skippedSteps;
    private Boolean dismissed;
    private LocalDateTime lastUpdated;
}
```

2. **Add GraphQL Mutations:**
```graphql
mutation UpdateOnboardingState($input: OnboardingStateInput!) {
  updateOnboardingState(input: $input) {
    completedSteps
    skippedSteps
    dismissed
  }
}
```

3. **Sync Strategy:**
   - Local storage as primary source (fast UI)
   - Debounced sync to server (every 2-3 seconds)
   - Server state loaded on initial page load
   - Conflict resolution: server wins on load, local wins on update

## Responsive Behavior

The components are fully responsive:

- **Mobile (< 768px):**
  - Full-width buttons
  - Stacked layout
  - Smaller text sizes
  - Touch-friendly tap targets (min 44px)

- **Desktop (≥ 768px):**
  - Fixed-width buttons
  - Horizontal layout
  - Larger typography
  - Hover states

## Accessibility

- **Keyboard Navigation:** All buttons focusable and operable
- **Screen Readers:** Semantic HTML with proper ARIA labels
- **Focus Management:** Clear visual focus indicators
- **Color Contrast:** WCAG 2.1 AA compliant (ODS tokens)

## Testing Checklist

- [ ] State persists across page refreshes
- [ ] Completing a step updates UI immediately
- [ ] Skipping a step updates UI immediately
- [ ] "Close Onboarding" appears when all steps done
- [ ] Dismiss button hides entire onboarding
- [ ] localStorage key is unique per implementation
- [ ] Icons render correctly in action buttons
- [ ] Navigation works for all step actions
- [ ] Responsive on mobile and desktop
- [ ] StatusBadge displays with success colors
- [ ] Yellow buttons use correct ODS tokens

## Files Reference

### UI-Kit
- `/ui-kit/src/hooks/ui/use-onboarding-state.ts` - State management hook
- `/ui-kit/src/components/shared/onboarding/onboarding-step-card.tsx` - Step card component
- `/ui-kit/src/components/shared/onboarding/onboarding-walkthrough.tsx` - Main orchestrator
- `/ui-kit/src/components/shared/onboarding/index.ts` - Exports
- `/ui-kit/src/components/index.ts` - Main exports (includes onboarding)
- `/ui-kit/src/hooks/ui/index.ts` - Hook exports (includes use-onboarding-state)

### Dashboard Implementation
- `/src/app/dashboard/components/onboarding-section.tsx` - Onboarding component (integrated)
- `/src/app/dashboard/page.tsx` - Main dashboard with onboarding

## Reusable in Product Releases

The `OnboardingStepCard` component can be reused for other list-based UIs:

```typescript
// Product releases integration (future)
<OnboardingStepCard
  step={{
    id: release.id,
    title: release.title,
    description: release.summary,
    actionIcon: <ChevronRight className="h-6 w-6" />,
    actionText: release.version,
    completedText: formatDate(release.release_date),
    onAction: () => router.push(`/releases/${release.slug}`)
  }}
  isCompleted={false}
  onAction={() => router.push(`/releases/${release.slug}`)}
  onSkip={() => {}}
/>
```

## Best Practices

1. **Use unique step IDs:** Ensure IDs don't conflict across different onboarding flows
2. **Keep storage keys unique:** Different features should use different keys
3. **Implement onAction handlers:** Always provide meaningful actions (navigation, API calls)
4. **Test state persistence:** Verify localStorage works across sessions
5. **Consider mobile UX:** Ensure buttons are touch-friendly
6. **Use ODS tokens only:** Never hardcode colors or spacing
7. **Handle async actions:** Use async/await in onAction handlers for API calls

## Known Limitations

- **Local storage only:** Currently no server-side persistence (by design, planned for future)
- **No progress indicator:** Doesn't show "X of Y complete" counter (can be added if needed)
- **Single onboarding flow:** Each storageKey supports one flow (multiple keys for multiple flows)
- **No step ordering:** Steps render in array order (no dynamic reordering)

## Future Enhancements

- Server-side state synchronization via GraphQL
- Progress indicator component (e.g., "3 of 5 complete")
- Conditional steps based on user roles
- Analytics tracking for completion rates
- Step reordering with drag-and-drop
- Guided tours with tooltips and highlights
- Multi-step wizard mode with next/previous
- A/B testing support for onboarding variations

---

**Last Updated:** January 21, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready (Local Storage Only)
