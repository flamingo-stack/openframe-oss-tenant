'use client';

import { NoData, type NoDataProps } from '@flamingo-stack/openframe-frontend-core/components/ui';

export type EmptyStateProps = NoDataProps;

/**
 * App-wide empty state. Renders the library `NoData` centered both vertically
 * and horizontally in the available content area. Pass only the `NoData` props
 * you need — icon/title/description for a simple message, plus `actions` and
 * `buttonLabel`/`button` for the richer onboarding layout.
 */
export function EmptyState(props: EmptyStateProps) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <NoData {...props} />
    </div>
  );
}
