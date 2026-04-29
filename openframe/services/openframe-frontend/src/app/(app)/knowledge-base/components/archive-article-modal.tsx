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
import { useEffect, useState } from 'react';

export interface ArchiveArticleTarget {
  id: string;
  name: string;
}

interface ArchiveArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ArchiveArticleTarget | null;
  onConfirm?: (articleId: string) => void | Promise<void>;
}

export function ArchiveArticleModal({ isOpen, onClose, article, onConfirm }: ArchiveArticleModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!article || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm?.(article.id);
      toast({
        title: 'Article archived',
        description: article.name,
        variant: 'success',
      });
      onClose();
    } catch (err) {
      toast({
        title: 'Archive failed',
        description: err instanceof Error ? err.message : 'Unable to archive article',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={handleConfirm}
          disabled={!article || isSubmitting}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Archiving...' : 'Archive Article'}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
