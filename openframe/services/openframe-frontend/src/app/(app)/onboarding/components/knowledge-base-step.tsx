'use client';

import { CheckCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';

/**
 * Inner body of the "Knowledge Base" onboarding step — an intro to building docs for the
 * AI Assistant. "Create Article" opens the knowledge-base editor.
 */
export function KnowledgeBaseStep() {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Build your own library of docs: setup guides, common fixes, policies, and FAQs. Organize articles into folders,
        save drafts before publishing, and keep everything structured so your team always finds the right answer fast.
      </p>

      {/* Footer actions */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <div className="hidden flex-1 md:block" />
        <Button
          variant="outline"
          leftIcon={<CheckCircleIcon className="size-5" />}
          onClick={() => toast({ title: 'Step marked complete', variant: 'success' })}
          className="w-full md:flex-1"
        >
          Mark as Complete
        </Button>
        <Button variant="accent" onClick={() => router.push('/knowledge-base/new')} className="w-full md:flex-1">
          Create Article
        </Button>
      </div>
    </div>
  );
}
