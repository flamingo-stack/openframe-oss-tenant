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
import { forwardRef, Suspense, useMemo, useState } from 'react';
import {
  buildFolderTree,
  type FolderTreeNode,
  getKnowledgeBaseItemsConnectionId,
  useKnowledgeBaseFolders,
} from '../hooks/use-knowledge-base-items';
import { useUnarchiveArticle } from '../hooks/use-unarchive-article';

export interface UnarchiveArticleTarget {
  id: string;
  name: string;
}

interface UnarchiveArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: UnarchiveArticleTarget | null;
  /** Connection ID of the archive list — the article is removed from here on success. */
  sourceConnectionId: string;
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
        {selectedName ?? 'Root (no folder)'}
      </span>
      <Chevron02DownIcon className="size-6 shrink-0 text-ods-text-secondary transition-transform data-[state=open]:rotate-180" />
    </button>
  ),
);
DropdownTrigger.displayName = 'UnarchiveDropdownTrigger';

function buildMenuItems(
  nodes: FolderTreeNode[],
  onSelect: (folder: { id: string | null; name: string }) => void,
): ActionsMenuItem[] {
  return nodes.map(node => {
    const childItems = node.children?.length ? buildMenuItems(node.children, onSelect) : [];
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

interface UnarchiveContentProps {
  onClose: () => void;
  article: UnarchiveArticleTarget;
  sourceConnectionId: string;
}

function UnarchiveContent({ onClose, article, sourceConnectionId }: UnarchiveContentProps) {
  const { toast } = useToast();
  const { unarchiveArticle, isPending } = useUnarchiveArticle();
  const folders = useKnowledgeBaseFolders();
  const [selected, setSelected] = useState<{ id: string | null; name: string } | null>(null);

  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const groups = useMemo(
    () => [
      {
        items: [
          {
            id: '__root__',
            label: 'Root (no folder)',
            onClick: () => setSelected({ id: null, name: 'Root (no folder)' }),
          } satisfies ActionsMenuItem,
          ...buildMenuItems(tree, setSelected),
        ],
      },
    ],
    [tree],
  );

  const handleConfirm = async () => {
    if (!selected || isPending) return;
    const targetConnectionId =
      selected.id === null ? null : getKnowledgeBaseItemsConnectionId({ parentId: selected.id, search: null });
    try {
      await unarchiveArticle({
        id: article.id,
        parentId: selected.id,
        removeFromConnections: [sourceConnectionId],
        appendToConnections: targetConnectionId ? [targetConnectionId] : [],
      });
      toast({ title: 'Unarchived', description: `${article.name} restored`, variant: 'success' });
      onClose();
    } catch {
      // hook already toasted
    }
  };

  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)] overflow-visible">
        <p className="text-h4 text-ods-text-primary">Restore To</p>
        <ActionsMenuDropdown
          groups={groups}
          align="start"
          side="bottom"
          sideOffset={4}
          customTrigger={<DropdownTrigger selectedName={selected?.name ?? null} />}
        />
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!selected || isPending}
          loading={isPending}
        >
          {isPending ? 'Restoring...' : 'Unarchive'}
        </Button>
      </ModalV2Footer>
    </>
  );
}

function UnarchiveContentSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <p className="text-h4 text-ods-text-primary">Restore To</p>
        <div className="h-12 w-full rounded-[6px] bg-ods-card animate-pulse" />
      </ModalV2Content>
      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" className="flex-1" disabled>
          Unarchive
        </Button>
      </ModalV2Footer>
    </>
  );
}

export function UnarchiveArticleModal({ isOpen, onClose, article, sourceConnectionId }: UnarchiveArticleModalProps) {
  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Unarchive Article</ModalV2Title>
      </ModalV2Header>
      {isOpen && article ? (
        <Suspense fallback={<UnarchiveContentSkeleton onClose={onClose} />}>
          <UnarchiveContent onClose={onClose} article={article} sourceConnectionId={sourceConnectionId} />
        </Suspense>
      ) : (
        <UnarchiveContentSkeleton onClose={onClose} />
      )}
    </ModalV2>
  );
}
