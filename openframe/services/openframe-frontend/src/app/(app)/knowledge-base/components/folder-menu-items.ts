import type { ActionsMenuItem } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { type FolderTreeNode, KNOWLEDGE_BASE_ROOT_LABEL } from '../hooks/use-knowledge-base-items';

export interface FolderMenuTarget {
  id: string | null;
  name: string;
}

export const FOLDER_ROOT_MENU_ID = '__kb_root__';
export const FOLDER_ROOT_TARGET: FolderMenuTarget = { id: null, name: KNOWLEDGE_BASE_ROOT_LABEL };

interface BuildFolderMenuItemsOptions {
  excludeFolderId?: string | null;
}

export function buildFolderMenuItems(
  nodes: FolderTreeNode[],
  onSelect: (target: FolderMenuTarget) => void,
  options?: BuildFolderMenuItemsOptions,
): ActionsMenuItem[] {
  const excludeId = options?.excludeFolderId ?? null;
  return nodes
    .filter(node => node.id !== excludeId)
    .map(node => {
      const childItems = node.children?.length ? buildFolderMenuItems(node.children, onSelect, options) : [];

      if (childItems.length === 0) {
        return {
          id: node.id,
          label: node.name,
          onClick: () => onSelect({ id: node.id, name: node.name }),
        } satisfies ActionsMenuItem;
      }

      return {
        id: node.id,
        label: node.name,
        type: 'submenu',
        submenu: [
          {
            id: `${node.id}__self`,
            label: node.name,
            onClick: () => onSelect({ id: node.id, name: node.name }),
          },
          { id: `${node.id}__sep`, label: '', type: 'separator' },
          ...childItems,
        ],
      } satisfies ActionsMenuItem;
    });
}

export function buildFolderMenuItemsWithRoot(
  nodes: FolderTreeNode[],
  onSelect: (target: FolderMenuTarget) => void,
  options?: BuildFolderMenuItemsOptions,
): ActionsMenuItem[] {
  return [
    {
      id: FOLDER_ROOT_MENU_ID,
      label: FOLDER_ROOT_TARGET.name,
      onClick: () => onSelect(FOLDER_ROOT_TARGET),
    },
    ...buildFolderMenuItems(nodes, onSelect, options),
  ];
}
