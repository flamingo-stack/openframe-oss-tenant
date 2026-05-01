'use client';

import type { ActionsMenuGroup, PageActionButton } from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  FolderEditIcon,
  PenEditIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Card,
  PageLayout,
  SquareAvatar,
  Tag,
  TicketAttachmentsList,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { notFound, useRouter } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { formatFileSize } from '@/app/(app)/devices/utils/file-manager-utils';
import { formatDate } from '@/lib/format-date';
import { getKnowledgeBaseItemsConnectionId } from '../hooks/use-knowledge-base-items';
import { useKnowledgeBaseItem } from '../hooks/use-knowledge-base-item';
import { usePublishArticle } from '../hooks/use-publish-article';
import { useUnpublishArticle } from '../hooks/use-unpublish-article';
import { ArchiveArticleModal } from './archive-article-modal';
import { SimpleMarkdownRenderer } from './lazy-markdown';
import { MoveToFolderModal } from './move-to-folder-modal';

interface ArticleDetailsPageProps {
  articleId: string;
}

type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const STATUS_VARIANT: Record<ArticleStatus, 'success' | 'grey' | 'outline'> = {
  PUBLISHED: 'success',
  DRAFT: 'grey',
  ARCHIVED: 'outline',
};

function ArticleDetailsContent({ articleId }: { articleId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const article = useKnowledgeBaseItem(articleId);
  const { publishArticle, isPending: isPublishing } = usePublishArticle();
  const { unpublishArticle, isPending: isUnpublishing } = useUnpublishArticle();

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  if (!article || article.type !== 'ARTICLE') {
    notFound();
  }

  const status = (article.status ?? 'DRAFT') as ArticleStatus;
  const updatedAt = article.updatedAt ?? article.createdAt;
  const sourceConnectionId = getKnowledgeBaseItemsConnectionId({
    parentId: article.parentId ?? null,
    search: null,
  });

  const authorName = useMemo(() => {
    if (!article.author) return null;
    const parts = [article.author.firstName, article.author.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : (article.author.email ?? null);
  }, [article.author]);

  const uiAttachments = useMemo(() => {
    if (!article.attachments) return [];
    return article.attachments.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileSize: att.fileSize ? formatFileSize(att.fileSize) : '',
      onDownload: () => {},
    }));
  }, [article.attachments]);

  const handlePublish = async () => {
    try {
      await publishArticle(article.id);
      toast({ title: 'Published', description: article.name, variant: 'success' });
    } catch {
      // hook already toasted
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishArticle(article.id);
      toast({ title: 'Moved to draft', description: article.name, variant: 'success' });
    } catch {
      // hook already toasted
    }
  };

  const menuActions = useMemo<ActionsMenuGroup[]>(
    () => [
      {
        items: [
          ...(status !== 'ARCHIVED'
            ? [
                {
                  id: 'archive',
                  label: 'Archive',
                  icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: () => setArchiveOpen(true),
                },
              ]
            : []),
          {
            id: 'move-to-folder',
            label: 'Move to Folder',
            icon: <FolderEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            onClick: () => setMoveOpen(true),
          },
        ],
      },
    ],
    [status],
  );

  const actions: PageActionButton[] = [
    {
      label: 'Edit Article',
      href: `/knowledge-base/edit/${article.id}`,
      icon: <PenEditIcon size={24} className="text-ods-text-secondary" />,
      variant: 'card',
    },
    ...(status === 'DRAFT'
      ? [
          {
            label: isPublishing ? 'Publishing...' : 'Publish',
            onClick: handlePublish,
            disabled: isPublishing,
            variant: 'primary' as const,
          },
        ]
      : []),
    ...(status === 'PUBLISHED'
      ? [
          {
            label: isUnpublishing ? 'Saving...' : 'Move to Draft',
            onClick: handleUnpublish,
            disabled: isUnpublishing,
            variant: 'card' as const,
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      title={article.name}
      backButton={{ label: 'Back to Knowledge Base', onClick: () => router.push('/knowledge-base') }}
      actionsVariant="menu-primary"
      actions={actions}
      menuActions={menuActions}
    >
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {article.tags.map(tag => (
            <Tag key={tag.id} label={tag.key} variant="outline" className="max-w-full" />
          ))}
        </div>
      )}

      <Card className="px-4 py-0 border-ods-border">
        <div className="grid grid-cols-2 gap-x-4 lg:grid-cols-3">
          <div className="flex min-w-0 items-center gap-2 h-20">
            <SquareAvatar fallback={authorName ?? 'A'} alt={authorName ?? 'Author'} size="md" variant="round" />
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-h4 text-ods-text-primary truncate">{authorName ?? 'Unknown'}</p>
              <p className="text-heading-5 text-ods-text-secondary truncate">Author</p>
            </div>
          </div>

          <div className="flex flex-col min-w-0 h-20 justify-center">
            <p className="text-h4 text-ods-text-primary truncate">{updatedAt ? formatDate(updatedAt) : '-'}</p>
            <p className="text-heading-5 text-ods-text-secondary truncate">Updated</p>
          </div>

          <div className="col-span-2 -mx-4 border-t border-ods-border lg:hidden" aria-hidden />

          <div className="flex flex-col min-w-0 h-20 justify-center items-start gap-1">
            <Tag variant={STATUS_VARIANT[status]} label={status} />
            <p className="text-heading-5 text-ods-text-secondary truncate">Status</p>
          </div>
        </div>
      </Card>

      <SimpleMarkdownRenderer content={article.content ?? ''} textSize="compact" />

      {article.attachments && article.attachments.length > 0 && <TicketAttachmentsList attachments={uiAttachments} />}

      <ArchiveArticleModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        article={archiveOpen ? { id: article.id, name: article.name } : null}
        sourceConnectionId={sourceConnectionId}
      />
      <MoveToFolderModal
        isOpen={moveOpen}
        onClose={() => setMoveOpen(false)}
        item={moveOpen ? { id: article.id, name: article.name, type: 'article' } : null}
        sourceConnectionId={sourceConnectionId}
      />
    </PageLayout>
  );
}

function ArticleDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="h-8 w-1/2 rounded bg-ods-card animate-pulse" />
      <div className="h-32 w-full rounded bg-ods-card animate-pulse" />
      <div className="h-64 w-full rounded bg-ods-card animate-pulse" />
    </div>
  );
}

export function ArticleDetailsPage({ articleId }: ArticleDetailsPageProps) {
  return (
    <Suspense fallback={<ArticleDetailsSkeleton />}>
      <ArticleDetailsContent articleId={articleId} />
    </Suspense>
  );
}

// Required for the prop name to be referenced by the wrapper above when imported.
export type { ArticleDetailsPageProps };
