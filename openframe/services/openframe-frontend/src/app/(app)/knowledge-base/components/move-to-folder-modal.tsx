'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  type ActionsMenuItem,
  Button,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { forwardRef, useEffect, useMemo, useState } from 'react';

export interface FolderTreeNode {
  id: string;
  name: string;
  children?: FolderTreeNode[];
}

export interface MoveToFolderResult {
  folderId: string;
  folderName: string;
}

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tree of folders shown in the dropdown. Folders with `children` render as nested submenus. */
  folders: FolderTreeNode[];
  /** Optional id excluded from the tree (e.g. the folder being moved itself). */
  excludeFolderId?: string | null;
  /** Optional name of the item being moved — used in the success toast description. */
  itemName?: string;
  onConfirm?: (result: MoveToFolderResult) => void | Promise<void>;
}

interface DropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selectedName: string | null;
}

const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ selectedName, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-3 rounded-[6px] bg-ods-card border transition-colors',
        'border-ods-border hover:border-ods-text-secondary',
        'data-[state=open]:border-ods-accent',
        className,
      )}
    >
      <span
        className={cn(
          'flex-1 min-w-0 text-left text-h4 truncate',
          selectedName ? 'text-ods-text-primary' : 'text-ods-text-secondary',
        )}
      >
        {selectedName ?? 'Select Folder'}
      </span>
      <Chevron02DownIcon className="size-6 shrink-0 text-ods-text-secondary transition-transform data-[state=open]:rotate-180" />
    </button>
  ),
);
DropdownTrigger.displayName = 'MoveToFolderDropdownTrigger';

function buildMenuItems(
  nodes: FolderTreeNode[],
  excludeFolderId: string | null | undefined,
  onSelect: (folder: { id: string; name: string }) => void,
): ActionsMenuItem[] {
  return nodes
    .filter(node => node.id !== excludeFolderId)
    .map(node => {
      const childItems = node.children?.length ? buildMenuItems(node.children, excludeFolderId, onSelect) : [];

      if (childItems.length > 0) {
        return {
          id: node.id,
          label: node.name,
          type: 'submenu',
          submenu: childItems,
        } satisfies ActionsMenuItem;
      }

      return {
        id: node.id,
        label: node.name,
        onClick: () => onSelect({ id: node.id, name: node.name }),
      } satisfies ActionsMenuItem;
    });
}

export function MoveToFolderModal({
  isOpen,
  onClose,
  folders,
  excludeFolderId,
  itemName,
  onConfirm,
}: MoveToFolderModalProps) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const groups = useMemo(
    () => [{ items: buildMenuItems(folders, excludeFolderId, setSelected) }],
    [folders, excludeFolderId],
  );

  const handleConfirm = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm?.({ folderId: selected.id, folderName: selected.name });
      toast({
        title: 'Moved',
        description: itemName ? `${itemName} moved to ${selected.name}` : `Moved to ${selected.name}`,
        variant: 'success',
      });
      onClose();
    } catch (err) {
      toast({
        title: 'Move failed',
        description: err instanceof Error ? err.message : 'Unable to move',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Move to Folder</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)] overflow-visible">
        <p className="text-h4 text-ods-text-primary">Folder Name</p>
        <ActionsMenuDropdown
          groups={groups}
          align="start"
          side="bottom"
          sideOffset={4}
          customTrigger={<DropdownTrigger selectedName={selected?.name ?? null} />}
        />
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!selected || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Moving...' : 'Move Folder'}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
