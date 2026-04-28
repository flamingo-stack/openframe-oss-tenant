'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useState } from 'react';

interface UseCopyToClipboardOptions {
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  errorDescription?: string;
  resetDelay?: number;
}

export function useCopyToClipboard({
  successTitle = 'Copied',
  successDescription = 'Copied to clipboard',
  errorTitle = 'Copy failed',
  errorDescription = 'Could not copy to clipboard',
  resetDelay = 2000,
}: UseCopyToClipboardOptions = {}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast({ title: successTitle, description: successDescription, variant: 'success' });
        setTimeout(() => setCopied(false), resetDelay);
      } catch {
        toast({ title: errorTitle, description: errorDescription, variant: 'destructive' });
      }
    },
    [successTitle, successDescription, errorTitle, errorDescription, resetDelay, toast],
  );

  return { copy, copied };
}
