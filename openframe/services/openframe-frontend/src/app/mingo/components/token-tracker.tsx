'use client';

import type { TokenUsageData } from '@flamingo-stack/openframe-frontend-core';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';

interface TokenTrackerProps {
  tokenUsage: TokenUsageData;
  className?: string;
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}

export function TokenTracker({ tokenUsage, className }: TokenTrackerProps) {
  const { totalTokensSize, contextSize } = tokenUsage;

  return (
    <div className={cn(
      'text-xs text-ods-text-secondary',
      className,
    )}>
      {formatWithCommas(totalTokensSize)} / {formatWithCommas(contextSize)} tokens used
    </div>
  );
}
