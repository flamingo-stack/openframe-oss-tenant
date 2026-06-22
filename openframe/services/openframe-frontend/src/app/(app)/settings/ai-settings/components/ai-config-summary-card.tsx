'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { InfoCell } from '@/app/components/shared/info-cell';
import type { AgentAiConfig } from '../types/ai-settings';
import { ANSWER_STYLE_LABEL, LLM_PROVIDER_ICON, LLM_PROVIDER_LABEL } from '../utils/ai-settings-display';

interface AiConfigSummaryCardProps {
  aiConfig: AgentAiConfig;
  /** Display name for `aiConfig.providerModel` (which stores the backend model name). */
  providerModelLabel?: string;
}

const CELL = 'flex items-center gap-2 min-h-14 md:min-h-20 px-3 md:px-4 py-3 md:py-4';

/** Read-only AI-logic summary (no appearance) — used by the ADMIN/Mingo tab. */
export function AiConfigSummaryCard({ aiConfig, providerModelLabel }: AiConfigSummaryCardProps) {
  const ProviderIcon = LLM_PROVIDER_ICON[aiConfig.llmProvider];
  const answerStyleLabel = aiConfig.answerStyle ? ANSWER_STYLE_LABEL[aiConfig.answerStyle] : '—';

  const cells: ReactNode[] = [
    <InfoCell
      value={LLM_PROVIDER_LABEL[aiConfig.llmProvider]}
      label="LLM Provider"
      icon={<ProviderIcon className="w-6 h-6 text-ods-text-secondary" />}
    />,
    <InfoCell value={providerModelLabel || aiConfig.providerModel || '—'} label="Provider Model" />,
    <InfoCell value={answerStyleLabel} label="Answer Style" />,
  ];

  return (
    <div className="bg-ods-card border border-ods-border rounded-md grid grid-cols-1 md:grid-cols-3">
      {cells.map((cell, idx) => (
        <div key={idx} className={cn(CELL, 'border-b border-ods-border md:border-b-0')}>
          {cell}
        </div>
      ))}
    </div>
  );
}
