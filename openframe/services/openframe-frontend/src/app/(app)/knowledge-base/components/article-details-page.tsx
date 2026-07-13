'use client';

import type { ActionsMenuGroup, PageActionButton } from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  FileEditIcon,
  FolderEditIcon,
  PenEditIcon,
  Refresh01LeftIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Card,
  PageLayout,
  SquareAvatar,
  Tag,
  TicketAttachmentsList,
  TicketDetailSection,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { notFound } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { AssignedItemsView } from '@/components/assignments';
import { formatDate } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import { decodeGlobalId } from '@/lib/relay-id';
import { routes } from '@/lib/routes';
import { formatFileSize } from '../../devices/utils/file-manager-utils';
import { CONTEXT_ENTITY_KIND } from '../../mingo/context/context-types';
import { useTrackOpenView } from '../../mingo/context/use-track-open-view';
import { getArchivedArticlesConnectionId } from '../hooks/use-archived-articles';
import { useDownloadArticleAttachment } from '../hooks/use-download-article-attachment';
import { useKnowledgeBaseItem } from '../hooks/use-knowledge-base-item';
import { getKnowledgeBaseArticlesConnectionId } from '../hooks/use-knowledge-base-items';
import { usePublishArticle } from '../hooks/use-publish-article';
import { useUnpublishArticle } from '../hooks/use-unpublish-article';
import { ArchiveArticleModal } from './archive-article-modal';
import { SimpleMarkdownRenderer } from './lazy-markdown';
import { MoveToFolderModal } from './move-to-folder-modal';
import { UnarchiveArticleModal } from './unarchive-article-modal';

interface ArticleDetailsPageProps {
  articleId: string;
}

type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

const STATUS_VARIANT: Record<ArticleStatus, 'success' | 'warning' | 'grey'> = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'grey',
};

function ArticleDetailsContent({ articleId }: { articleId: string }) {
  const handleBack = useSafeBack(routes.knowledgeBase.list);
  const { toast } = useToast();
  const article = useKnowledgeBaseItem(articleId);
  const { publishArticle, isPending: isPublishing } = usePublishArticle();
  const { unpublishArticle, isPending: isUnpublishing } = useUnpublishArticle();
  const { download: downloadAttachment } = useDownloadArticleAttachment();

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [unarchiveOpen, setUnarchiveOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // Mingo context carries the RAW db id (the route's `articleId` is the Relay
  // global id) — KB_ARTICLE is GraphQL-resolved, so the chip re-encodes it to a
  // global id for `node(id:)`. Registers the open article as the Mingo "open view".
  const articleDbId = useMemo(() => decodeGlobalId(articleId)?.rawId ?? articleId, [articleId]);
  useTrackOpenView(
    article && article.type === 'ARTICLE'
      ? { type: CONTEXT_ENTITY_KIND.KB_ARTICLE, id: articleDbId, label: article.name || articleDbId }
      : null,
  );

  if (!article || article.type !== 'ARTICLE') {
    notFound();
  }

  const status = (article.status ?? 'DRAFT') as ArticleStatus;
  const updatedAt = article.updatedAt ?? article.createdAt;
  const articlesConnectionId = getKnowledgeBaseArticlesConnectionId({
    parentId: article.parentId ?? null,
    search: null,
    tagIds: [],
  });
  const archiveConnectionId = getArchivedArticlesConnectionId({ search: null, tagIds: null });
  const sourceConnectionId = status === 'ARCHIVED' ? archiveConnectionId : articlesConnectionId;

  const authorName = useMemo(() => {
    if (!article.author) return null;
    const parts = [article.author.firstName, article.author.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : (article.author.email ?? null);
  }, [article.author]);

  const authorImageUrl = useMemo(
    () => getFullImageUrl(article.author?.image?.imageUrl, article.author?.image?.hash),
    [article.author?.image?.imageUrl, article.author?.image?.hash],
  );

  const uiAttachments = useMemo(() => {
    if (!article.attachments) return [];
    return article.attachments.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileSize: att.fileSize ? formatFileSize(att.fileSize) : '',
      onDownload: () => downloadAttachment(att.id, att.fileName),
    }));
  }, [article.attachments, downloadAttachment]);

  const handlePublish = useCallback(async () => {
    try {
      await publishArticle(article.id);
      toast({ title: 'Published', description: article.name, variant: 'success' });
    } catch {}
  }, [publishArticle, article.id, article.name, toast]);

  const handleUnpublish = useCallback(async () => {
    try {
      await unpublishArticle(article.id);
      toast({ title: 'Moved to draft', description: article.name, variant: 'success' });
    } catch {}
  }, [unpublishArticle, article.id, article.name, toast]);

  const menuActions = useMemo<ActionsMenuGroup[]>(() => {
    if (status === 'ARCHIVED') return [];
    return [
      {
        items: [
          {
            id: 'archive',
            label: 'Archive',
            icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
            onClick: () => setArchiveOpen(true),
          },
          {
            id: 'move-to-folder',
            label: 'Move to Folder',
            icon: <FolderEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            onClick: () => setMoveOpen(true),
          },
          ...(status === 'PUBLISHED'
            ? [
                {
                  id: 'move-to-draft',
                  label: isUnpublishing ? 'Saving...' : 'Move to Draft',
                  icon: <FileEditIcon className="w-6 h-6 text-ods-text-secondary" />,
                  onClick: handleUnpublish,
                  disabled: isUnpublishing,
                },
              ]
            : []),
        ],
      },
    ];
  }, [status, isUnpublishing, handleUnpublish]);

  const actions: PageActionButton[] =
    status === 'ARCHIVED'
      ? [
          {
            label: 'Unarchive',
            onClick: () => setUnarchiveOpen(true),
            icon: <Refresh01LeftIcon size={24} className="text-ods-text-secondary" />,
            variant: 'outline',
          },
        ]
      : [
          {
            label: 'Edit Article',
            href: routes.knowledgeBase.edit(article.id),
            icon: <PenEditIcon size={24} className="text-ods-text-secondary" />,
            variant: 'outline',
          },
          ...(status === 'DRAFT'
            ? [
                {
                  label: isPublishing ? 'Publishing...' : 'Publish Article',
                  onClick: handlePublish,
                  disabled: isPublishing,
                  variant: 'accent' as const,
                },
              ]
            : []),
        ];

  return (
    <PageLayout
      title={article.name}
      backButton={{ label: 'Back', onClick: handleBack }}
      actionsVariant="menu-primary"
      actions={actions}
      menuActions={menuActions}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      {article.tags?.some(Boolean) && (
        <div className="flex flex-wrap gap-[var(--spacing-system-xsf)]">
          {article.tags.filter(Boolean).map(tag => (
            <Tag key={tag.id} label={tag.key} variant="outline" className="max-w-full" />
          ))}
        </div>
      )}

      <Card className="px-[var(--spacing-system-mf)] py-0 border-ods-border">
        <div className="grid grid-cols-2 gap-x-[var(--spacing-system-mf)] lg:grid-cols-3">
          <div className="flex min-w-0 items-center gap-[var(--spacing-system-xsf)] h-20">
            <SquareAvatar
              src={authorImageUrl}
              fallback={authorName ?? 'A'}
              alt={authorName ?? 'Author'}
              size="md"
              variant="round"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-h4 text-ods-text-primary truncate" title={authorName ?? 'Unknown'}>
                {authorName ?? 'Unknown'}
              </p>
              <p className="text-heading-5 text-ods-text-secondary truncate">Author</p>
            </div>
          </div>

          <div className="flex flex-col min-w-0 h-20 justify-center">
            <p className="text-h4 text-ods-text-primary truncate" title={updatedAt ? formatDate(updatedAt) : '-'}>
              {updatedAt ? formatDate(updatedAt) : '-'}
            </p>
            <p className="text-heading-5 text-ods-text-secondary truncate">Updated</p>
          </div>

          <div className="col-span-2 -mx-[var(--spacing-system-mf)] border-t border-ods-border lg:hidden" aria-hidden />

          <div className="flex flex-col min-w-0 h-20 justify-center items-start gap-[var(--spacing-system-xxs)]">
            <Tag variant={STATUS_VARIANT[status]} label={status} />
            <p className="text-heading-5 text-ods-text-secondary truncate">Status</p>
          </div>
        </div>
      </Card>

      <SimpleMarkdownRenderer content={article.content ?? ''} textSize="compact" />

      {uiAttachments.length > 0 && (
        <TicketDetailSection label="Attachments">
          <TicketAttachmentsList attachments={uiAttachments} />
        </TicketDetailSection>
      )}

      <AssignedItemsView itemId={article.id} itemType="KNOWLEDGE_ARTICLE" />

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
      <UnarchiveArticleModal
        isOpen={unarchiveOpen}
        onClose={() => setUnarchiveOpen(false)}
        article={unarchiveOpen ? { id: article.id, name: article.name } : null}
        sourceConnectionId={sourceConnectionId}
      />
    </PageLayout>
  );
}

function ArticleDetailsFallback() {
  const handleBack = useSafeBack(routes.knowledgeBase.list);
  return (
    <PageLayout
      title=""
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="h-32 w-full rounded bg-ods-card animate-pulse" />
      <div className="h-64 w-full rounded bg-ods-card animate-pulse" />
    </PageLayout>
  );
}

export function ArticleDetailsPage({ articleId }: ArticleDetailsPageProps) {
  return (
    <Suspense fallback={<ArticleDetailsFallback />}>
      <ArticleDetailsContent articleId={articleId} />
    </Suspense>
  );
}

export type { ArticleDetailsPageProps };
