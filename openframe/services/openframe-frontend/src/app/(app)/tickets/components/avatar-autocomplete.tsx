'use client';

import { CheckIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type AutocompleteOption, SquareAvatar } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import type { AvatarOption } from '../hooks/use-ticket-options';

export type AvatarVariant = 'round' | 'square';

export function renderAvatarOption(variant: AvatarVariant) {
  return (option: AutocompleteOption, isSelected: boolean): ReactNode => {
    const { label, imageUrl } = option as AvatarOption;
    return (
      <div className="flex items-center justify-between w-full min-w-0 gap-[var(--spacing-system-xs)]">
        <div className="flex items-center gap-[var(--spacing-system-xs)] min-w-0">
          <SquareAvatar src={getFullImageUrl(imageUrl)} alt={label} fallback={label} size="sm" variant={variant} />
          <span className="truncate">{label}</span>
        </div>
        {isSelected && <CheckIcon className="text-ods-accent" size={20} />}
      </div>
    );
  };
}

export function avatarStartAdornment(option: AvatarOption | undefined, variant: AvatarVariant): ReactNode | undefined {
  if (!option) return undefined;
  return (
    <SquareAvatar
      src={getFullImageUrl(option.imageUrl)}
      alt={option.label}
      fallback={option.label}
      size="sm"
      variant={variant}
    />
  );
}
