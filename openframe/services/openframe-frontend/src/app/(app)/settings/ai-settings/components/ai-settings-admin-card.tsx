'use client';

import { InfoCell } from '@/app/components/shared/info-cell';
import type { AgentAiConfig } from '../types/ai-settings';
import { ANSWER_STYLE_LABEL, LLM_PROVIDER_ICON, LLM_PROVIDER_LABEL } from '../utils/ai-settings-display';

interface AiSettingsAdminCardProps {
  aiConfig: AgentAiConfig;
  /** Display name for `aiConfig.providerModel` (which stores the backend model name). */
  providerModelLabel?: string;
}

const CELL = 'flex items-center gap-2 min-h-14 md:min-h-20 px-3 md:px-4 py-3 md:py-4';

/**
 * Read-only summary card for the Mingo (ADMIN) tab: LLM provider, provider model
 * and answer style. The CLIENT counterpart (AiSettingsCustomerCard) adds the
 * appearance fields; this one carries only the AI-logic columns per the design.
 */
export function AiSettingsAdminCard({ aiConfig, providerModelLabel }: AiSettingsAdminCardProps) {
  const ProviderIcon = LLM_PROVIDER_ICON[aiConfig.llmProvider];
  const answerStyleLabel = aiConfig.answerStyle ? ANSWER_STYLE_LABEL[aiConfig.answerStyle] : '—';

  return (
    <div className="bg-ods-card border border-ods-border rounded-md grid grid-cols-1 sm:grid-cols-3">
      <div className={CELL}>
        <InfoCell
          value={LLM_PROVIDER_LABEL[aiConfig.llmProvider]}
          label="Mingo LLM Provider"
          icon={<ProviderIcon className="w-6 h-6 text-ods-text-secondary" />}
        />
      </div>
      <div className={CELL}>
        <InfoCell value={providerModelLabel || aiConfig.providerModel || '—'} label="Provider Model" />
      </div>
      <div className={CELL}>
        <InfoCell value={answerStyleLabel} label="Answer Style" />
      </div>
    </div>
  );
}
