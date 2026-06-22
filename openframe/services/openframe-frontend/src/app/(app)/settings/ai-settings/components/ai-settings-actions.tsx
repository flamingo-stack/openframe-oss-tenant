'use client';

import { PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';

interface UseAiSettingsActionsArgs {
  isEditMode: boolean;
  onEdit: () => void;
  onSave: () => void;
  /** Shows "Saving..." label on Save. */
  isSaving?: boolean;
  /** Extra reasons to disable Save beyond `isSaving` (e.g. missing required fields). */
  isSaveDisabled?: boolean;
}

export function useAiSettingsActions({
  isEditMode,
  onEdit,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
}: UseAiSettingsActionsArgs): PageActionButton[] {
  return useMemo<PageActionButton[]>(() => {
    if (!isEditMode) {
      return [
        {
          label: 'Edit Settings',
          variant: 'outline',
          icon: <PenEditIcon className="w-5 h-5 text-ods-text-secondary" />,
          onClick: onEdit,
        },
      ];
    }

    return [
      {
        label: isSaving ? 'Saving...' : 'Save Settings',
        variant: 'accent',
        onClick: onSave,
        disabled: isSaving || isSaveDisabled,
        loading: isSaving,
      },
    ];
  }, [isEditMode, onEdit, onSave, isSaving, isSaveDisabled]);
}
