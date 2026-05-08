'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyAssignmentsDiff, useAssignedItems } from '@/components/assignments';
import { ARTICLE_FORM_DEFAULTS, type ArticleFormData, articleFormSchema } from '../types/article.types';
import { useAddTag } from './use-add-tag';
import { useCreateArticle } from './use-create-article';
import type { KnowledgeBaseItemNode } from './use-knowledge-base-item';
import { getKnowledgeBaseItemsConnectionId } from './use-knowledge-base-items';
import { useCreateKnowledgeBaseTag } from './use-knowledge-base-tags';
import { usePublishArticle } from './use-publish-article';
import { useRemoveTag } from './use-remove-tag';
import { useUnarchiveArticle } from './use-unarchive-article';
import { useUnpublishArticle } from './use-unpublish-article';
import { useUpdateArticle } from './use-update-article';

export type SaveStatus = 'DRAFT' | 'PUBLISHED';

interface UseEditArticleFormOptions {
  articleId: string | null;
  initialFolderId?: string | null;
  initialArticle?: KnowledgeBaseItemNode | null;
}

interface ArticleTagRef {
  id: string;
  key: string;
}

interface SaveOptions {
  availableTags: ReadonlyArray<ArticleTagRef>;
}

export function useEditArticleForm({ articleId, initialFolderId, initialArticle }: UseEditArticleFormOptions) {
  const { toast } = useToast();
  const router = useRouter();

  const isEditMode = Boolean(articleId);

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: ARTICLE_FORM_DEFAULTS,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createArticle } = useCreateArticle();
  const { updateArticle } = useUpdateArticle();
  const { publishArticle } = usePublishArticle();
  const { unpublishArticle } = useUnpublishArticle();
  const { unarchiveArticle } = useUnarchiveArticle();
  const { addTag } = useAddTag();
  const { removeTag } = useRemoveTag();
  const { createTag } = useCreateKnowledgeBaseTag();

  const initialTagRefs = useMemo<ArticleTagRef[]>(() => {
    if (!initialArticle?.tags) return [];
    return initialArticle.tags.map(t => ({ id: t.id, key: t.key }));
  }, [initialArticle?.tags]);

  const assignedItems = useAssignedItems({
    itemId: articleId,
    itemType: 'KNOWLEDGE_ARTICLE',
    enabled: isEditMode,
  });

  useEffect(() => {
    if (isEditMode && initialArticle && initialArticle.type === 'ARTICLE' && assignedItems.isReady) {
      form.reset({
        title: initialArticle.name,
        folderId: initialArticle.parentId ?? null,
        tags: initialTagRefs.map(t => t.key),
        body: initialArticle.content ?? '',
        assignments: assignedItems.value,
      });
    } else if (!isEditMode) {
      form.reset({
        ...ARTICLE_FORM_DEFAULTS,
        folderId: initialFolderId ?? null,
      });
    }
  }, [isEditMode, initialArticle, initialFolderId, initialTagRefs, form, assignedItems.isReady, assignedItems.value]);

  const resolveTagIds = useCallback(
    async (keys: ReadonlyArray<string>, availableTags: ReadonlyArray<ArticleTagRef>): Promise<string[]> => {
      const byKey = new Map(availableTags.map(t => [t.key, t.id]));
      const ids: string[] = [];
      for (const key of keys) {
        const existing = byKey.get(key);
        if (existing) {
          ids.push(existing);
        } else {
          const created = await createTag(key);
          ids.push(created.id);
          byKey.set(created.key, created.id);
        }
      }
      return ids;
    },
    [createTag],
  );

  const handleSave = useCallback(
    (targetStatus: SaveStatus, options: SaveOptions) => {
      const { availableTags } = options;
      setIsSubmitting(true);

      form.handleSubmit(
        async data => {
          try {
            const tagIds = await resolveTagIds(data.tags, availableTags);
            const folderId = data.folderId;

            if (isEditMode && articleId && initialArticle && initialArticle.type === 'ARTICLE') {
              const initialIds = new Set(initialTagRefs.map(t => t.id));
              const nextIds = new Set(tagIds);
              const toAdd = tagIds.filter(id => !initialIds.has(id));
              const toRemove = initialTagRefs.filter(t => !nextIds.has(t.id)).map(t => t.id);
              await Promise.all([
                updateArticle({
                  input: {
                    id: articleId,
                    name: data.title,
                    parentId: folderId,
                    content: data.body,
                    summary: data.body.slice(0, 160),
                  },
                }),
                ...toAdd.map(tagId => addTag(articleId, tagId)),
                ...toRemove.map(tagId => removeTag(articleId, tagId)),
                applyAssignmentsDiff(articleId, 'KNOWLEDGE_ARTICLE', assignedItems.value, data.assignments ?? {}),
              ]);

              const currentStatus = (initialArticle.status ?? 'DRAFT') as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
              if (currentStatus !== targetStatus) {
                if (targetStatus === 'PUBLISHED') {
                  if (currentStatus === 'ARCHIVED') {
                    await unarchiveArticle({
                      id: articleId,
                      parentId: folderId,
                      removeFromConnections: [],
                    });
                  }
                  await publishArticle(articleId);
                } else {
                  if (currentStatus === 'ARCHIVED') {
                    await unarchiveArticle({
                      id: articleId,
                      parentId: folderId,
                      removeFromConnections: [],
                    });
                  } else {
                    await unpublishArticle(articleId);
                  }
                }
              }

              toast({ title: 'Success', description: 'Article updated', variant: 'success' });
              router.push(`/knowledge-base/details/${articleId}`);
            } else {
              const targetConnectionId = getKnowledgeBaseItemsConnectionId({
                parentId: folderId,
                search: null,
              });
              const result = await createArticle({
                input: {
                  name: data.title,
                  parentId: folderId,
                  content: data.body,
                  summary: data.body.slice(0, 160),
                  status: targetStatus,
                  tagIds,
                },
                connections: [targetConnectionId],
              });
              if (data.assignments && Object.keys(data.assignments).length > 0) {
                await applyAssignmentsDiff(result.id, 'KNOWLEDGE_ARTICLE', {}, data.assignments);
              }
              toast({ title: 'Success', description: 'Article created', variant: 'success' });
              router.push(`/knowledge-base/details/${result.id}`);
            }
          } catch {
          } finally {
            setIsSubmitting(false);
          }
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
    },
    [
      addTag,
      articleId,
      assignedItems.value,
      createArticle,
      form,
      initialArticle,
      initialTagRefs,
      isEditMode,
      publishArticle,
      removeTag,
      resolveTagIds,
      router,
      toast,
      unarchiveArticle,
      unpublishArticle,
      updateArticle,
    ],
  );

  return {
    form,
    isEditMode,
    isSubmitting,
    handleSave,
  };
}
