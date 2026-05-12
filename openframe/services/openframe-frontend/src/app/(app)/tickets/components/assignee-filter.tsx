'use client';

import { Filter02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useAssigneeOptions } from '../hooks/use-ticket-options';

interface AssigneeFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

export function AssigneeFilter({ value, onChange, className }: AssigneeFilterProps) {
  const { options, isLoading } = useAssigneeOptions();

  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Show All Employees"
      loading={isLoading}
      startAdornment={<Filter02Icon className="size-6 text-ods-text-secondary" />}
      className={className}
    />
  );
}
