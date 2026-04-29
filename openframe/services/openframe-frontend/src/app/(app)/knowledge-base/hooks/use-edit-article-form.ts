'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type ArticleAttachment, mockKnowledgeBaseItems } from '../mock-data';
import { ARTICLE_FORM_DEFAULTS, type ArticleFormData, articleFormSchema } from '../types/article.types';

export type ManagedFileStatus = 'uploading' | 'uploaded' | 'error';

export interface ManagedFile {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: ManagedFileStatus;
  error?: string;
}

interface UseEditArticleFormOptions {
  articleId: string | null;
  initialFolderId?: string | null;
}

function findArticle(id: string | null) {
  if (!id) return null;
  const item = mockKnowledgeBaseItems.find(i => i.id === id);
  return item && item.type === 'article' ? item : null;
}

export function useEditArticleForm({ articleId, initialFolderId }: UseEditArticleFormOptions) {
  const { toast } = useToast();
  const router = useRouter();

  const isEditMode = Boolean(articleId);
  const article = useMemo(() => findArticle(articleId), [articleId]);

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: ARTICLE_FORM_DEFAULTS,
  });

  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode && article) {
      const attachments: ArticleAttachment[] = article.attachments ?? [];
      form.reset({
        title: article.name,
        folderId: article.folderId ?? '',
        tags: article.tags ?? [],
        body: article.body ?? '',
        attachmentIds: attachments.map(a => a.id),
      });
      setManagedFiles(
        attachments.map(a => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          contentType: a.contentType,
          status: 'uploaded',
        })),
      );
    } else if (!isEditMode) {
      form.reset({ ...ARTICLE_FORM_DEFAULTS, folderId: initialFolderId ?? '' });
      setManagedFiles([]);
    }
  }, [isEditMode, article, initialFolderId, form]);

  const onAddFiles = useCallback(
    (files: File | File[] | undefined) => {
      if (!files) return;
      const fileArray = Array.isArray(files) ? files : [files];
      const additions: ManagedFile[] = fileArray.map(file => ({
        id: `local_${crypto.randomUUID()}`,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
        status: 'uploaded',
      }));
      setManagedFiles(prev => {
        const next = [...prev, ...additions];
        form.setValue(
          'attachmentIds',
          next.map(f => f.id),
          { shouldDirty: true },
        );
        return next;
      });
    },
    [form],
  );

  const onRemoveFile = useCallback(
    (id: string) => {
      setManagedFiles(prev => {
        const next = prev.filter(f => f.id !== id);
        form.setValue(
          'attachmentIds',
          next.map(f => f.id),
          { shouldDirty: true },
        );
        return next;
      });
    },
    [form],
  );

  const handleSave = useCallback(() => {
    setIsSubmitting(true);
    form.handleSubmit(
      data => {
        // Mock persistence: keep the in-memory list in sync so the table reflects the change.
        const idx = mockKnowledgeBaseItems.findIndex(i => i.id === articleId);
        const attachments: ArticleAttachment[] = managedFiles.map(f => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          contentType: f.contentType,
        }));

        if (isEditMode && idx >= 0) {
          const existing = mockKnowledgeBaseItems[idx];
          if (existing.type === 'article') {
            mockKnowledgeBaseItems[idx] = {
              ...existing,
              name: data.title,
              folderId: data.folderId,
              tags: data.tags,
              body: data.body,
              attachments,
            };
          }
        } else {
          mockKnowledgeBaseItems.push({
            id: `article-${crypto.randomUUID()}`,
            type: 'article',
            name: data.title,
            description: data.body.slice(0, 160),
            createdAt: new Date().toISOString(),
            folderId: data.folderId,
            tags: data.tags,
            body: data.body,
            attachments,
          });
        }

        toast({
          title: 'Success',
          description: isEditMode ? 'Article updated' : 'Article created',
          variant: 'success',
        });
        setIsSubmitting(false);
        router.push('/knowledge-base');
      },
      errors => {
        const messages = Object.values(errors)
          .map(e => (e && 'message' in e ? (e.message as string | undefined) : undefined))
          .filter(Boolean);
        toast({
          title: 'Validation Error',
          description: messages.join(', ') || 'Please fix the highlighted fields.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
      },
    )();
  }, [articleId, form, isEditMode, managedFiles, router, toast]);

  return {
    form,
    isEditMode,
    isSubmitting,
    handleSave,
    managedFiles,
    onAddFiles,
    onRemoveFile,
  };
}
