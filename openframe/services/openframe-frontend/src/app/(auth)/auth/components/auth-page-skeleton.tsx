'use client';

import { AuthShell } from '@flamingo-stack/openframe-frontend-core/components/features';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

export type AuthPageSkeletonVariant = 'create-organization' | 'login' | 'complete-account';

interface AuthPageSkeletonProps {
  variant?: AuthPageSkeletonVariant;
  /** Sign Up / Login tab selector placeholder (hidden e.g. on the invite page). */
  withTabs?: boolean;
}

/** Label + input placeholder matching the core `Input` with a text-h4 label. */
function FieldSkeleton() {
  return (
    <div className="flex w-full flex-col">
      <Skeleton className="mb-1 h-5 w-28 md:h-6" />
      <Skeleton className="h-11 w-full rounded-[6px] md:h-12" />
    </div>
  );
}

/** Placeholder matching the default-size core `Button`. */
function ButtonSkeleton({ className }: { className?: string }) {
  return <Skeleton className={`h-10 rounded-md md:h-12 ${className ?? ''}`} />;
}

/** Title + subtitle placeholder matching the form header (text-h2 + text-h4). */
function HeaderSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="h-6 w-56 md:h-8 md:w-80 my-1" />
      <Skeleton className="h-4 w-72 md:h-5 md:w-96 max-w-full my-0.5" />
    </div>
  );
}

function CreateOrganizationFormSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      {/* Terms checkbox block */}
      <Skeleton className="h-11 w-full rounded-md md:h-12" />
      {/* Continue on the right half */}
      <div className="flex items-center gap-[var(--spacing-system-l)]">
        <div className="hidden flex-1 md:block" />
        <ButtonSkeleton className="w-full md:w-auto md:flex-1" />
      </div>
    </>
  );
}

function LoginFormSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <FieldSkeleton />
      {/* Forgot Password + Continue */}
      <div className="flex items-center gap-[var(--spacing-system-l)]">
        <ButtonSkeleton className="flex-1" />
        <ButtonSkeleton className="flex-1" />
      </div>
    </>
  );
}

function CompleteAccountFormSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      {/* SSO shortcuts load after the providers request — skeleton matches the initial no-SSO render */}
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      {/* Back + submit */}
      <div className="flex items-center gap-[var(--spacing-system-l)]">
        <ButtonSkeleton className="flex-1" />
        <ButtonSkeleton className="flex-1" />
      </div>
    </>
  );
}

const FORM_SKELETONS: Record<AuthPageSkeletonVariant, () => React.ReactNode> = {
  'create-organization': CreateOrganizationFormSkeleton,
  login: LoginFormSkeleton,
  'complete-account': CompleteAccountFormSkeleton,
};

/**
 * Loading placeholder for the auth pages. Renders the real AuthShell (branding
 * and benefits are static) with a skeleton of the given form inside the same
 * card chrome the real forms use, so there is no layout shift on load.
 */
export function AuthPageSkeleton({ variant = 'create-organization', withTabs = true }: AuthPageSkeletonProps) {
  const FormSkeleton = FORM_SKELETONS[variant];

  return (
    <div role="status" aria-label="Loading authentication page">
      <AuthShell tabs={withTabs ? <Skeleton className="h-12 w-full rounded-md" /> : undefined}>
        {/* Card chrome copied from the shared auth forms */}
        <div className="flex w-full flex-col gap-[var(--spacing-system-l)] rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-xl)]">
          <FormSkeleton />
        </div>
      </AuthShell>
    </div>
  );
}
