'use client';

import {
  AnthropicLogoIcon,
  GeminiLogoIcon,
  OpenaiLogoGreyIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ComponentType } from 'react';

interface ModelRate {
  icon: ComponentType<{ className?: string }>;
  model: string;
  rate: string;
}

const MODEL_RATES: ModelRate[] = [
  { icon: AnthropicLogoIcon, model: 'Claude Sonnet 4.5', rate: '12:1' },
  { icon: AnthropicLogoIcon, model: 'Claude Opus 4.1', rate: '47:1' },
  { icon: OpenaiLogoGreyIcon, model: 'GPT-4o', rate: '10:1' },
  { icon: OpenaiLogoGreyIcon, model: 'GPT-4o mini', rate: '1:1' },
  { icon: OpenaiLogoGreyIcon, model: 'GPT-3.5 Turbo', rate: '1:1' },
  { icon: GeminiLogoIcon, model: 'Gemini 2.5 Flash', rate: '1:1' },
  { icon: GeminiLogoIcon, model: 'Gemini 2.5 Pro', rate: '14:1' },
  { icon: GeminiLogoIcon, model: 'Gemini 2.0 Flash', rate: '1:1' },
  { icon: GeminiLogoIcon, model: 'Gemini 2.5 Flash Lite', rate: '1:1' },
];

export function ModelTokenRates() {
  return (
    <div className="flex flex-col bg-ods-card rounded-[6px] overflow-hidden w-[260px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ods-border text-h5 text-ods-text-secondary uppercase tracking-[-0.02em]">
        <span className="flex-1">Model</span>
        <span>OpenFrame Token</span>
      </div>
      {MODEL_RATES.map(({ icon: Icon, model, rate }) => (
        <div key={model} className="flex items-center gap-2 px-3 py-2">
          <Icon className="size-6 shrink-0" />
          <span className="text-h6 text-ods-text-primary whitespace-nowrap">{model}</span>
          <div className="flex-1 h-px bg-ods-border min-w-2" />
          <span className="text-h6 text-ods-text-primary whitespace-nowrap">{rate}</span>
        </div>
      ))}
    </div>
  );
}
