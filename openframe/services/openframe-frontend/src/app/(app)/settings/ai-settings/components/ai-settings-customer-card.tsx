'use client';

import { EntityImage } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { InfoCell } from '@/app/components/shared/info-cell';
import { getFullImageUrl } from '@/lib/image-url';
import type { FaeSettings } from '../types/fae-settings';
import {
  ANSWER_STYLE_LABEL,
  APPLICATION_THEME_LABEL,
  LLM_PROVIDER_ICON,
  LLM_PROVIDER_LABEL,
} from '../utils/fae-settings-display';

interface AiSettingsCustomerCardProps {
  settings: FaeSettings;
  /** Display name for `settings.providerModel` (which stores the backend model name). */
  providerModelLabel?: string;
}

const CELL = 'flex items-center gap-2 min-h-14 md:min-h-20 px-3 md:px-4 py-3 md:py-4';

export function AiSettingsCustomerCard({ settings, providerModelLabel }: AiSettingsCustomerCardProps) {
  const ProviderIcon = LLM_PROVIDER_ICON[settings.llmProvider];
  const answerStyleLabel = settings.answerStyle ? ANSWER_STYLE_LABEL[settings.answerStyle] : '—';

  const cells: ReactNode[] = [
    <>
      <EntityImage
        src={getFullImageUrl(settings.assistantAvatar?.imageUrl, settings.assistantAvatar?.hash)}
        alt={settings.assistantName}
        className="size-10 rounded-full"
      />
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <p className="text-ods-text-primary text-h4 truncate">{settings.assistantName}</p>
        <p className="text-ods-text-secondary text-h6 truncate">Assistant Name</p>
      </div>
    </>,
    <InfoCell
      value={LLM_PROVIDER_LABEL[settings.llmProvider]}
      label="LLM Provider"
      icon={<ProviderIcon className="w-6 h-6 text-ods-text-secondary" />}
    />,
    <InfoCell value={providerModelLabel || settings.providerModel || '—'} label="Provider Model" />,
    <InfoCell value={answerStyleLabel} label="Answer Style" />,
    <InfoCell value={APPLICATION_THEME_LABEL[settings.applicationTheme]} label="Application Theme" />,
    <InfoCell value={settings.accentColor} label="Accent Color" />,
  ];

  return (
    <div className="bg-ods-card border border-ods-border rounded-md grid grid-cols-2 md:grid-cols-4">
      {cells.map((cell, idx) => (
        <div key={idx} className={cn(CELL, idx < cells.length - 2 && 'border-b border-ods-border')}>
          {cell}
        </div>
      ))}
    </div>
  );
}
