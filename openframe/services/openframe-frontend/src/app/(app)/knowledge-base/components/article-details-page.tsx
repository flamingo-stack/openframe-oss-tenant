'use client';

import type { ActionsMenuGroup, PageActionButton } from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  Download01Icon,
  FileIcon,
  FolderEditIcon,
  PenEditIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Badge,
  Button,
  Card,
  PageLayout,
  SquareAvatar,
  Tag,
  TicketAttachmentsList,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { notFound, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { formatFileSize } from '@/app/(app)/devices/utils/file-manager-utils';
import { formatDate } from '@/lib/format-date';
import type { ArticleStatus } from '../mock-data';
import { mockKnowledgeBaseItems } from '../mock-data';
import { SimpleMarkdownRenderer } from './lazy-markdown';

interface ArticleDetailsPageProps {
  articleId: string;
}

const STATUS_VARIANT: Record<ArticleStatus, 'success' | 'grey' | 'outline'> = {
  PUBLISHED: 'success',
  DRAFT: 'grey',
  ARCHIVED: 'outline',
};

export function ArticleDetailsPage({ articleId }: ArticleDetailsPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const article = useMemo(() => {
    const item = mockKnowledgeBaseItems.find(i => i.id === articleId);
    return item && item.type === 'article' ? item : null;
  }, [articleId]);

  const uiAttachments = useMemo(() => {
    if (!article?.attachments) return [];
    return article.attachments.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileSize: att.fileSize ? formatFileSize(att.fileSize) : '',
      onDownload: () => {},
    }));
  }, [article?.attachments]);

  const menuActions = useMemo<ActionsMenuGroup[]>(
    () => [
      {
        items: [
          {
            id: 'archive',
            label: 'Archive',
            icon: <BoxArchiveIcon className="w-6 h-6 text-ods-text-secondary" />,
            onClick: () => toast({ title: 'Archived', description: 'Article archived', variant: 'success' }),
          },
          {
            id: 'move-to-folder',
            label: 'Move to Folder',
            icon: <FolderEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            onClick: () =>
              toast({ title: 'Move to Folder', description: 'Folder selection coming soon', variant: 'default' }),
          },
        ],
      },
    ],
    [toast],
  );

  if (!article) {
    notFound();
  }

  const status = article.status ?? 'PUBLISHED';
  const updatedAt = article.updatedAt ?? article.createdAt;

  const actions: PageActionButton[] = [
    {
      label: 'Edit Article',
      href: `/knowledge-base/edit/${article.id}`,
      icon: <PenEditIcon size={24} className="text-ods-text-secondary" />,
      variant: 'card',
    },
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
            <Tag key={tag} label={tag} variant="outline" className="max-w-full" />
          ))}
        </div>
      )}

      <Card className="px-4 py-0 border-ods-border">
        <div className="grid grid-cols-2 gap-x-4 lg:grid-cols-3">
          <div className="flex min-w-0 items-center gap-2 h-20">
            <SquareAvatar
              src={article.author?.avatarUrl}
              fallback={article.author?.name ?? 'A'}
              alt={article.author?.name ?? 'Author'}
              size="md"
              variant="round"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-h4 text-ods-text-primary truncate">{article.author?.name ?? 'Unknown'}</p>
              <p className="text-heading-5 text-ods-text-secondary truncate">Author</p>
            </div>
          </div>

          <div className="flex flex-col min-w-0 h-20 justify-center">
            <p className="text-h4 text-ods-text-primary truncate">{formatDate(updatedAt)}</p>
            <p className="text-heading-5 text-ods-text-secondary truncate">Updated</p>
          </div>

          <div className="col-span-2 -mx-4 border-t border-ods-border lg:hidden" aria-hidden />

          <div className="flex flex-col min-w-0 h-20 justify-center items-start gap-1">
            <Tag variant={STATUS_VARIANT[status]} label={status} />
            <p className="text-heading-5 text-ods-text-secondary truncate">Status</p>
          </div>
        </div>
      </Card>

      <SimpleMarkdownRenderer content={article.body ?? ''} textSize="compact" />

      {article.attachments && article.attachments.length > 0 && <TicketAttachmentsList attachments={uiAttachments} />}
    </PageLayout>
  );
}
