'use client';

import {
  AnthropicLogoIcon,
  GeminiLogoIcon,
  OpenaiLogoGreyIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ComponentType } from 'react';
import { graphql, useLazyLoadQuery } from 'react-relay';
import type { modelTokenRatesQuery as ModelTokenRatesQueryType } from '@/__generated__/modelTokenRatesQuery.graphql';

const PROVIDER_ICON: Record<string, ComponentType<{ className?: string }>> = {
  ANTHROPIC: AnthropicLogoIcon,
  OPENAI: OpenaiLogoGreyIcon,
  GOOGLE_GEMINI: GeminiLogoIcon,
};

const modelTokenRatesQuery = graphql`
  query modelTokenRatesQuery {
    aiModelRates {
      modelName
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

export function ModelTokenRates() {
  const data = useLazyLoadQuery<ModelTokenRatesQueryType>(
    modelTokenRatesQuery,
    {},
    { fetchPolicy: 'store-or-network' },
  );
  const rates = data.aiModelRates;

  if (rates.length === 0) return null;

  return (
    <div className="flex flex-col bg-ods-card rounded-[6px] overflow-hidden w-[260px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ods-border text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">
        <span className="flex-1">Model</span>
        <span>OpenFrame Token</span>
      </div>
      {rates.map(rate => {
        const Icon = PROVIDER_ICON[rate.providerType];
        return (
          <div key={`${rate.providerType}-${rate.modelName}`} className="flex items-center gap-2 px-3 py-2">
            {Icon && <Icon className="size-6 shrink-0" />}
            <span className="text-h6 text-ods-text-primary whitespace-nowrap">{rate.modelName}</span>
            <div className="flex-1 h-px bg-ods-border min-w-2" />
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
  );
}
