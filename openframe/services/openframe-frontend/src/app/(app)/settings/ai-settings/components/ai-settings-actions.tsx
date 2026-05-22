'use client';

import { PenEditIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Save, X } from 'lucide-react';
import { useMemo } from 'react';

interface UseAiSettingsActionsArgs {
  isEditMode: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  /** Disables Cancel + shows "Saving..." label on Save. */
  isSaving?: boolean;
  /** Extra reasons to disable Save beyond `isSaving` (e.g. missing required fields). */
  isSaveDisabled?: boolean;
  /** Extra reasons to disable Cancel beyond `isSaving`. */
  isCancelDisabled?: boolean;
}

export function useAiSettingsActions({
  isEditMode,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  isSaveDisabled = false,
  isCancelDisabled = false,
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
        icon: <Save className="w-5 h-5" />,
        onClick: onSave,
        disabled: isSaving || isSaveDisabled,
        loading: isSaving,
      },
      {
        label: 'Cancel',
        variant: 'outline',
        icon: <X className="w-5 h-5 text-ods-text-secondary" />,
        onClick: onCancel,
        disabled: isSaving || isCancelDisabled,
      },
    ];
  }, [isEditMode, onEdit, onSave, onCancel, isSaving, isSaveDisabled, isCancelDisabled]);
}
