'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/** A label + control pair, matching one cell of the form-fields grid. */
function FieldSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}

/**
 * Loading state for the v2 Edit Script page. Renders inside the real
 * `PageLayout` (with the title, back button and disabled actions) so only the
 * form body swaps when the Relay query resolves — no header jump. The body
 * mirrors the v2 `ScriptFormFields` layout: 2 platform cards (no Run as User),
 * a 3-field row (Name / Shell Type / Timeout — no Category), description,
 * arguments + env vars, then the editor.
 */
export function EditScriptSkeleton() {
  const placeholderActions = [
    { label: 'Test Script', onClick: () => {}, variant: 'outline' as const, disabled: true },
    { label: 'Save Script', onClick: () => {}, variant: 'accent' as const, disabled: true },
  ];

  return (
    <PageLayout
      title="Edit Script"
      backButton={{ label: 'Back', onClick: () => {} }}
      actions={placeholderActions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6">
        {/* Supported Platform */}
        <div>
          <Skeleton className="h-7 w-44 mb-2" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
        </div>

        {/* Name / Shell Type / Timeout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>

        {/* Description */}
        <div>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>

        {/* Script Arguments + Environment Vars */}
        <div className="flex flex-col lg:flex-row gap-6">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>

        {/* Syntax editor */}
        <div>
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-[300px] lg:h-[600px] w-full rounded-md" />
        </div>
      </div>
    </PageLayout>
  );
}
