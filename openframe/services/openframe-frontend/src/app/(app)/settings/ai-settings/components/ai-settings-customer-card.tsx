'use client';

import { ClaudeIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { EntityImage } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import type { ReactNode } from 'react';
import { InfoCell } from '@/app/components/shared/info-cell';

interface AiSettingsCustomerCardProps {
  assistantName: string;
  assistantAvatarUrl?: string;
  llmProvider: string;
  providerModel: string;
  answerStyle: string;
  applicationTheme: string;
  accentColor: string;
}

const CELL = 'flex items-center gap-2 min-h-14 md:min-h-20 px-3 md:px-4 py-3 md:py-4';

export function AiSettingsCustomerCard({
  assistantName,
  assistantAvatarUrl,
  llmProvider,
  providerModel,
  answerStyle,
  applicationTheme,
  accentColor,
}: AiSettingsCustomerCardProps) {
  const cells: ReactNode[] = [
    <>
      <EntityImage src={assistantAvatarUrl} alt={assistantName} className="size-10 rounded-full" />
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <p className="text-ods-text-primary text-h4 truncate">{assistantName}</p>
        <p className="text-ods-text-secondary text-h6 truncate">Assistant Name</p>
      </div>
    </>,
    <InfoCell
      value={llmProvider}
      label="LLM Provider"
      icon={<ClaudeIcon className="w-6 h-6 text-ods-text-secondary" />}
    />,
    <InfoCell value={providerModel} label="Provider Model" />,
    <InfoCell value={answerStyle} label="Answer Style" />,
    <InfoCell value={applicationTheme} label="Application Theme" />,
    <InfoCell value={accentColor} label="Accent Color" />,
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
