'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ActionsMenuDropdown, Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { AssignmentRow } from './assignment-row';
import { TARGET_CONFIG } from './target-config';
import { ASSIGNMENT_TARGET_TYPES, type AssignmentRef, type AssignmentsValue, type AssignmentTargetType } from './types';

interface AssignmentsFieldProps {
  value: AssignmentsValue;
  onChange: (next: AssignmentsValue) => void;
  enabledTypes?: AssignmentTargetType[];
  disabled?: boolean;
  className?: string;
}

const isPresent = (refs: AssignmentRef[] | undefined): refs is AssignmentRef[] => refs !== undefined;

export function AssignmentsField({
  value,
  onChange,
  enabledTypes = ASSIGNMENT_TARGET_TYPES as AssignmentTargetType[],
  disabled,
  className,
}: AssignmentsFieldProps) {
  const activeTypes = useMemo(() => enabledTypes.filter(type => isPresent(value[type])), [enabledTypes, value]);

  const availableTypes = useMemo(() => enabledTypes.filter(type => !isPresent(value[type])), [enabledTypes, value]);

  const setRow = (type: AssignmentTargetType, refs: AssignmentRef[]) => {
    onChange({ ...value, [type]: refs });
  };

  const removeRow = (type: AssignmentTargetType) => {
    const next = { ...value };
    delete next[type];
    onChange(next);
  };

  const addRow = (type: AssignmentTargetType) => {
    onChange({ ...value, [type]: [] });
  };

  const menuGroups = [
    {
      items: availableTypes.map(type => {
        const meta = TARGET_CONFIG[type];
        const Icon = meta.icon;
        return {
          id: type,
          label: meta.menuLabel,
          icon: <Icon />,
          onClick: () => addRow(type),
        };
      }),
    },
  ];

  return (
    <div className={className}>
      <div className="flex flex-col gap-[var(--spacing-system-lf)]">
        {activeTypes.map(type => (
          <AssignmentRow
            key={type}
            targetType={type}
            value={value[type] ?? []}
            onChange={refs => setRow(type, refs)}
            onRemoveRow={() => removeRow(type)}
            disabled={disabled}
          />
        ))}

        {availableTypes.length > 0 && (
          <ActionsMenuDropdown
            align="start"
            side="bottom"
            sideOffset={4}
            groups={menuGroups}
            customTrigger={
              <Button
                type="button"
                variant="transparent"
                disabled={disabled}
                leftIcon={<PlusCircleIcon />}
                className="self-start text-ods-text-secondary"
              >
                Assign Item
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
