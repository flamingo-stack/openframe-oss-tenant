'use client';

import { EntityImage } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { InfoCell } from '@/app/components/shared/info-cell';
import { getFullImageUrl } from '@/lib/image-url';
import type { AgentAiConfig, ClientView } from '../types/ai-settings';
import {
  ANSWER_STYLE_LABEL,
  APPLICATION_THEME_LABEL,
  LLM_PROVIDER_ICON,
  LLM_PROVIDER_LABEL,
} from '../utils/ai-settings-display';

interface AiSettingsCustomerCardProps {
  aiConfig: AgentAiConfig;
  view: ClientView;
  /** Display name for `aiConfig.providerModel` (which stores the backend model name). */
  providerModelLabel?: string;
}

const CELL = 'flex items-center gap-2 min-h-14 md:min-h-20 px-3 md:px-4 py-3 md:py-4';

export function AiSettingsCustomerCard({ aiConfig, view, providerModelLabel }: AiSettingsCustomerCardProps) {
  const ProviderIcon = LLM_PROVIDER_ICON[aiConfig.llmProvider];
  const answerStyleLabel = aiConfig.answerStyle ? ANSWER_STYLE_LABEL[aiConfig.answerStyle] : '—';

  const cells: ReactNode[] = [
    <>
      <EntityImage
        src={getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash)}
        alt={view.assistantName}
        // EntityImage defaults to size-[52px] md:size-[60px]; override both
        // breakpoints so the avatar stays 40×40 (the md: default would otherwise win).
        className="size-10 md:size-10 rounded-full"
      />
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <p className="text-ods-text-primary text-h4 truncate">{view.assistantName}</p>
        <p className="text-ods-text-secondary text-h6 truncate">Assistant Name</p>
      </div>
    </>,
    <InfoCell
      value={LLM_PROVIDER_LABEL[aiConfig.llmProvider]}
      label="LLM Provider"
      icon={<ProviderIcon className="w-6 h-6 text-ods-text-secondary" />}
    />,
    <InfoCell value={providerModelLabel || aiConfig.providerModel || '—'} label="Provider Model" />,
    <InfoCell value={answerStyleLabel} label="Answer Style" />,
    <InfoCell value={APPLICATION_THEME_LABEL[view.applicationTheme]} label="Application Theme" />,
    <InfoCell value={view.accentColor?.toUpperCase()} label="Accent Color" />,
  ];

  return (
    <div className="bg-ods-card border border-ods-border rounded-md grid grid-cols-2 lg:grid-cols-4">
      {cells.map((cell, idx) => (
        <div key={idx} className={cn(CELL, idx < cells.length - 2 && 'border-b border-ods-border')}>
          {cell}
        </div>
      ))}
    </div>
  );
}
