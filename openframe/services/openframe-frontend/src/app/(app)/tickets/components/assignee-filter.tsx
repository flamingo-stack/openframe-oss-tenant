'use client';

import { Filter02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores';
import { useAssigneeOptions } from '../hooks/use-ticket-options';
import { renderAvatarOption } from './avatar-autocomplete';

interface AssigneeFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const renderOption = renderAvatarOption('round');

export function AssigneeFilter({ value, onChange, className }: AssigneeFilterProps) {
  const { options, isLoading } = useAssigneeOptions();
  const currentUserId = useAuthStore(state => state.user?.id);

  const sortedOptions = useMemo(() => {
    const idx = currentUserId ? options.findIndex(o => o.value === currentUserId) : -1;
    if (idx <= 0) return options;
    return [options[idx], ...options.slice(0, idx), ...options.slice(idx + 1)];
  }, [options, currentUserId]);

  return (
    <Autocomplete
      multiple
      options={sortedOptions}
      value={value}
      onChange={onChange}
      placeholder="Show All Employees"
      loading={isLoading}
      startAdornment={<Filter02Icon className="size-6 text-ods-text-secondary" />}
      renderOption={renderOption}
      className={className}
    />
  );
}
