'use client';

import { TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete, Button, FieldWrapper } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo, useState } from 'react';
import { TARGET_CONFIG } from './target-config';
import type { AssignmentRef, AssignmentTargetType } from './types';
import { type AssignmentSearchOption, useAssignmentSearch } from './use-assignment-search';

interface AssignmentRowProps {
  targetType: AssignmentTargetType;
  value: AssignmentRef[];
  onChange: (next: AssignmentRef[]) => void;
  onRemoveRow: () => void;
  disabled?: boolean;
}

export function AssignmentRow({ targetType, value, onChange, onRemoveRow, disabled }: AssignmentRowProps) {
  const meta = TARGET_CONFIG[targetType];
  const [searchInput, setSearchInput] = useState('');
  const { options, isLoading } = useAssignmentSearch(targetType, searchInput);

  const selectedIds = useMemo(() => value.map(ref => ref.id), [value]);

  const mergedOptions = useMemo<AssignmentSearchOption[]>(() => {
    const seen = new Set<string>();
    const result: AssignmentSearchOption[] = [];
    for (const ref of value) {
      if (seen.has(ref.id)) continue;
      seen.add(ref.id);
      result.push({ value: ref.id, label: ref.label });
    }
    for (const opt of options) {
      if (seen.has(opt.value)) continue;
      seen.add(opt.value);
      result.push(opt);
    }
    return result;
  }, [options, value]);

  const handleChange = (nextIds: string[]) => {
    const byId = new Map(mergedOptions.map(opt => [opt.value, opt.label]));
    const next = nextIds.map(id => ({ id, label: byId.get(id) ?? id }));
    onChange(next);
  };

  return (
    <FieldWrapper label={meta.rowLabel}>
      <div className="flex items-stretch gap-[var(--spacing-system-xsf)]">
        <div className="flex-1 min-w-0">
          <Autocomplete
            multiple
            options={mergedOptions}
            value={selectedIds}
            onChange={handleChange}
            onInputChange={(value, reason) => {
              if (reason === 'input' || reason === 'clear') setSearchInput(value);
            }}
            placeholder="Add More..."
            loading={isLoading}
            disableClientFilter
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Remove ${meta.menuLabel} assignments`}
          onClick={onRemoveRow}
          disabled={disabled}
          className="shrink-0 text-ods-attention-red-error"
          leftIcon={<TrashIcon />}
        />
      </div>
    </FieldWrapper>
  );
}
