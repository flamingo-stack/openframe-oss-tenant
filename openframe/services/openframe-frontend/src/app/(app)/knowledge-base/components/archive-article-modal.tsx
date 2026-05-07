'use client';

import {
  Button,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useArchiveArticle } from '../hooks/use-archive-article';
import { ARCHIVED_ARTICLES_CONNECTION_KEY, getArchivedArticlesConnectionId } from '../hooks/use-archived-articles';

export interface ArchiveArticleTarget {
  id: string;
  name: string;
}

interface ArchiveArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArchiveArticleTarget | null;
  sourceConnectionId: string;
}

export function ArchiveArticleModal({ isOpen, onClose, article, sourceConnectionId }: ArchiveArticleModalProps) {
  const { toast } = useToast();
  const { archiveArticle, isPending } = useArchiveArticle();

  const handleConfirm = async () => {
    if (!article || isPending) return;
    const archiveConnectionId = getArchivedArticlesConnectionId({ search: null, tagIds: null });
    try {
      await archiveArticle({
        id: article.id,
        removeFromConnections: [sourceConnectionId],
        appendToConnections: [archiveConnectionId],
      });
      toast({ title: 'Article archived', description: article.name, variant: 'success' });
      onClose();
    } catch {}
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalV2Header>
        <ModalV2Title>Archive Article</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content>
        <p className="text-h4 text-ods-text-primary">
          Are you sure you want to archive <span className="text-ods-error">{article?.name ?? 'this'}</span> article?
        </p>
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!article || isPending}
          loading={isPending}
        >
          {isPending ? 'Archiving...' : 'Archive Article'}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}

export { ARCHIVED_ARTICLES_CONNECTION_KEY };
