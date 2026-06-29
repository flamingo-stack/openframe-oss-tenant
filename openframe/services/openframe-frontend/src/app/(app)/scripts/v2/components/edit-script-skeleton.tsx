'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

/** A `text-lg` field label (Name / Shell Type / Timeout / Description / Syntax). */
function FieldLabelSkeleton({ width }: { width: string }) {
  return <Skeleton className={`h-7 ${width}`} />;
}

/** A label + input pair, matching one cell of the form-fields grid. */
function FieldSkeleton({ labelWidth = 'w-24' }: { labelWidth?: string }) {
  return (
    <div className="space-y-1">
      <FieldLabelSkeleton width={labelWidth} />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}

/**
 * One `ScriptArguments` block: a tight title label over the first key input, the
 * value input beside it with a trailing delete button, then the "Add" button —
 * mirroring the core component's row + footer layout.
 */
function ScriptArgumentsSkeleton({ titleWidth, addWidth }: { titleWidth: string; addWidth: string }) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex w-full items-end gap-2">
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <Skeleton className={`h-5 ${titleWidth}`} />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Skeleton className="h-12 flex-1 rounded-md" />
          <Skeleton className="h-12 w-12 rounded-md shrink-0" />
        </div>
      </div>
      <Skeleton className={`h-10 ${addWidth} rounded-md`} />
    </div>
  );
}

/**
 * Loading state for the v2 Edit Script page. Renders inside the real
 * `PageLayout` (title, back button, disabled Test / Save actions) so only the
 * form body swaps when the Relay query resolves — no header jump. The body
 * mirrors the v2 `ScriptFormFields` layout: platform cards (Windows / MacOS +
 * Run as User), a 3-field row (Name / Shell Type / Timeout — no Category),
 * description, the tags picker, arguments + env vars, then the editor.
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
        {/* Supported Platform: 2 platform cards + Run as User, h-11 md:h-16 like SelectButton */}
        <div>
          <FieldLabelSkeleton width="w-44" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-1">
            <Skeleton className="h-11 md:h-16 rounded-md" />
            <Skeleton className="h-11 md:h-16 rounded-md" />
            <Skeleton className="h-11 md:h-16 rounded-md" />
          </div>
        </div>

        {/* Name / Shell Type / Timeout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <FieldSkeleton labelWidth="w-20" />
          <FieldSkeleton labelWidth="w-28" />
          <FieldSkeleton labelWidth="w-24" />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <FieldLabelSkeleton width="w-32" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>

        {/* Tags picker (Autocomplete) */}
        <div className="space-y-1">
          <FieldLabelSkeleton width="w-44" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>

        {/* Script Arguments + Environment Vars */}
        <div className="flex flex-col lg:flex-row gap-6">
          <ScriptArgumentsSkeleton titleWidth="w-36" addWidth="w-44" />
          <ScriptArgumentsSkeleton titleWidth="w-32" addWidth="w-40" />
        </div>

        {/* Syntax editor */}
        <div className="space-y-1">
          <FieldLabelSkeleton width="w-20" />
          <Skeleton className="h-[300px] lg:h-[600px] w-full rounded-md" />
        </div>
      </div>
    </PageLayout>
  );
}
