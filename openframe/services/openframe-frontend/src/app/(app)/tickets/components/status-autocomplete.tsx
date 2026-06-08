'use client';

import { CheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type AutocompleteOption, ColorSwatch } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';

export interface StatusOption extends AutocompleteOption {
  color: string;
}

export function renderStatusOption(option: AutocompleteOption, isSelected: boolean): ReactNode {
  const { label, color } = option as StatusOption;
  return (
    <div className="flex items-center justify-between w-full min-w-0 gap-[var(--spacing-system-xs)]">
      <div className="flex items-center gap-[var(--spacing-system-xs)] min-w-0">
        <ColorSwatch color={color} />
        <span className="truncate" title={label}>
          {label}
        </span>
      </div>
      {isSelected && <CheckIcon className="text-ods-accent" size={20} />}
    </div>
  );
}

export function statusStartAdornment(option: StatusOption | undefined): ReactNode | undefined {
  if (!option) return undefined;
  return <ColorSwatch color={option.color} />;
}
