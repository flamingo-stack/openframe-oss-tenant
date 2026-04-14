'use client';

import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback } from 'react';
import { useTagValueSuggestions } from './use-tag-value-suggestions';

interface TagValueAutocompleteProps {
  tagKey: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  label?: string;
  className?: string;
}

export function TagValueAutocomplete({ tagKey, values, onChange, error, label, className }: TagValueAutocompleteProps) {
  const { options, isRefetching, handleInputChange, resetInput } = useTagValueSuggestions(tagKey);

  const handleChange = useCallback(
    (newValues: string[]) => {
      resetInput();
      onChange(newValues);
    },
    [onChange, resetInput],
  );

  return (
    <Autocomplete
      multiple
      options={options}
      value={values}
      onChange={handleChange}
      onInputChange={handleInputChange}
      placeholder={values.length > 0 ? 'Add More...' : 'Enter value...'}
      label={label}
      className={className}
      loading={isRefetching}
      error={error}
      showChevron={false}
      disableClientFilter
      creatable
      freeSolo
    />
  );
}
