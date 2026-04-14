'use client';

import { StatusBadge, TabSelector, type TabSelectorItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { OS_TYPES } from '@flamingo-stack/openframe-frontend-core/types';
import type { OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { getOSIcon } from '@flamingo-stack/openframe-frontend-core/utils';

export interface PlatformSelectorOption {
  platformId: OSPlatformId;
  disabled?: boolean;
  badge?: {
    text: string;
    colorScheme?: 'cyan' | 'green' | 'yellow' | 'purple' | 'pink' | 'success' | 'error' | 'warning' | 'default';
  };
}

export interface OsPlatformSelectorProps {
  value: OSPlatformId;
  onValueChange: (platform: OSPlatformId) => void;
  label?: string;
  options?: PlatformSelectorOption[];
  disabledPlatforms?: OSPlatformId[];
  className?: string;
  variant?: 'primary' | 'secondary';
  iconSize?: string;
}

export function OsPlatformSelector({
  value,
  onValueChange,
  label,
  options,
  disabledPlatforms = [],
  className,
  variant = 'primary',
  iconSize = 'w-5 h-5',
}: OsPlatformSelectorProps) {
  const platformOptions: PlatformSelectorOption[] =
    options || OS_TYPES.map(os => ({ platformId: os.platformId, disabled: disabledPlatforms.includes(os.platformId) }));

  const items: TabSelectorItem[] = platformOptions
    .map(option => {
      const osType = OS_TYPES.find(os => os.platformId === option.platformId);
      if (!osType) return null;

      const IconComponent = getOSIcon(osType.value);
      const isActive = value === option.platformId;

      return {
        id: option.platformId,
        label: osType.label,
        icon: IconComponent ? (
          <IconComponent className={iconSize} color={variant === 'primary' && isActive ? '#212121' : undefined} />
        ) : undefined,
        disabled: option.disabled,
        badge: option.badge ? (
          <StatusBadge text={option.badge.text} variant="button" colorScheme={option.badge.colorScheme || 'cyan'} />
        ) : undefined,
      };
    })
    .filter(Boolean) as TabSelectorItem[];

  return (
    <TabSelector
      value={value}
      onValueChange={id => onValueChange(id as OSPlatformId)}
      items={items}
      variant={variant}
      label={label}
      className={className}
    />
  );
}
