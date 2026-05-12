'use client';

import { Filter02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useState } from 'react';
import { useOrganizationOptions } from '../hooks/use-ticket-options';

interface OrganizationFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

export function OrganizationFilter({ value, onChange, className }: OrganizationFilterProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { options, isLoading } = useOrganizationOptions(debouncedSearch);

  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      onChange={onChange}
      onInputChange={setSearch}
      disableClientFilter
      placeholder="Show All Organizations"
      loading={isLoading}
      startAdornment={<Filter02Icon className="size-6 text-ods-text-secondary" />}
      className={className}
    />
  );
}
