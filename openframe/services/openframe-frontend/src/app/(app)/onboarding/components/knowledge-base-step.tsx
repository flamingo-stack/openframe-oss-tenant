'use client';

import { CheckCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { usePathname, useRouter } from 'next/navigation';
import { onboardingHintUrl } from '../onboarding-coach-marks';

/**
 * Inner body of the "Knowledge Base" onboarding step — an intro to building docs for the
 * AI Assistant. "Create Article" opens the knowledge-base editor.
 */
export function KnowledgeBaseStep({
  onComplete,
  onCompleteBackground,
  completed,
  completing,
}: {
  onComplete?: () => void;
  onCompleteBackground?: () => void;
  completed?: boolean;
  completing?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Build your own library of docs: setup guides, common fixes, policies, and FAQs. Organize articles into folders,
        save drafts before publishing, and keep everything structured so your team always finds the right answer fast.
      </p>

      {/* Footer actions */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-1 md:block" />
        {!completed ? (
          <Button
            variant="outline"
            leftIcon={<CheckCircleIcon className="size-5" />}
            onClick={() => onComplete?.()}
            loading={completing}
            disabled={completing}
            className="w-full md:flex-1"
          >
            Mark as Complete
          </Button>
        ) : (
          // Keep the completed step's primary button its own width — don't let it
          // stretch into the removed "Mark as Complete" slot.
          <div className="hidden md:block md:flex-1" aria-hidden />
        )}
        <Button
          variant="accent"
          onClick={() => {
            // Heading to the article editor completes the step in the background
            // (if not already done) — no spinner, navigation is the feedback.
            if (!completed) onCompleteBackground?.();
            router.push(onboardingHintUrl('/knowledge-base/new', 'knowledge', pathname));
          }}
          className="w-full md:flex-1"
        >
          Create Article
        </Button>
      </div>
    </div>
  );
}
