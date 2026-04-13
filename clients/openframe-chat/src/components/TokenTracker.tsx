import type { TokenUsageData } from '@flamingo-stack/openframe-frontend-core';

interface TokenTrackerProps {
  tokenUsage: TokenUsageData;
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US');
}

export function TokenTracker({ tokenUsage }: TokenTrackerProps) {
  const { totalTokensSize, contextSize } = tokenUsage;

  return (
    <div className="text-xs text-ods-text-secondary mt-1">
      {formatWithCommas(totalTokensSize)} / {formatWithCommas(contextSize)} tokens used
    </div>
  );
}
