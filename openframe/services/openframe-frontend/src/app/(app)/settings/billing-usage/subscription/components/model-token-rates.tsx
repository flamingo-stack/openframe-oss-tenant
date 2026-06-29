'use client';

import {
  AnthropicLogoIcon,
  GeminiLogoIcon,
  OpenaiLogoGreyIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type ComponentType, Suspense } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { modelTokenRatesQuery as ModelTokenRatesQueryType } from '@/__generated__/modelTokenRatesQuery.graphql';

const PROVIDER_ICON: Record<string, ComponentType<{ className?: string }>> = {
  ANTHROPIC: AnthropicLogoIcon,
  OPENAI: OpenaiLogoGreyIcon,
  GOOGLE_GEMINI: GeminiLogoIcon,
};

const SKELETON_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10'] as const;

const modelTokenRatesQuery = graphql`
  query modelTokenRatesQuery {
    aiModelRates {
      modelName
      displayName
      providerType
      inputTokenRate
      outputTokenRate
    }
  }
`;

function formatRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1) return `${Math.round(value)}:1`;
  return `1:${Math.round(1 / value)}`;
}

/**
 * Self-contained Suspense boundary: the rates query is fetched lazily on tooltip
 * open, so it must not suspend the page-level boundary (that would flash the
 * full-page skeleton). Falls back to a local skeleton instead.
 */
export function ModelTokenRates() {
  return (
    <Suspense fallback={<ModelTokenRatesSkeleton />}>
      <ModelTokenRatesContent />
    </Suspense>
  );
}

function ModelTokenRatesContent() {
  const data = useLazyLoadQuery<ModelTokenRatesQueryType>(
    modelTokenRatesQuery,
    {},
    { fetchPolicy: 'store-and-network' },
  );
  const rates = data.aiModelRates;

  if (rates.length === 0) return null;

  return (
    <div className="flex flex-col bg-ods-card border border-ods-border rounded-[6px] overflow-hidden min-w-[260px] max-h-[min(60vh,420px)]">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-ods-border text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">
        <span className="flex-1">Model</span>
        <span>OpenFrame Token</span>
      </div>
      {/* Scroll the rows when the model list is taller than the capped height; the header stays pinned. */}
      <div className="flex flex-col overflow-y-auto">
        {rates.map(rate => {
          const Icon = PROVIDER_ICON[rate.providerType];
          return (
            <div key={`${rate.providerType}-${rate.modelName}`} className="flex items-center gap-2 px-3 py-2">
              {Icon && <Icon className="size-6 shrink-0" />}
              <span className="text-h6 text-ods-text-primary whitespace-nowrap">
                {rate.displayName || rate.modelName}
              </span>
              <div className="flex-1 h-px bg-ods-border min-w-8" />
              <span className="text-h6 text-ods-text-primary whitespace-nowrap">
                {formatRate(rate.inputTokenRate)}
                {rate.outputTokenRate !== rate.inputTokenRate && (
                  <span className="text-ods-text-secondary"> / {formatRate(rate.outputTokenRate)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelTokenRatesSkeleton() {
  return (
    <div className="flex flex-col bg-ods-card border border-ods-border rounded-[6px] overflow-hidden min-w-[260px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ods-border">
        <Skeleton className="h-4 w-12" />
        <div className="flex-1" />
        <Skeleton className="h-4 w-28" />
      </div>
      {SKELETON_ROW_KEYS.map(key => (
        <div key={key} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="size-6 rounded-full shrink-0" />
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
