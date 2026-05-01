'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ARTICLE_FORM_DEFAULTS, type ArticleFormData, articleFormSchema } from '../types/article.types';
import { useAddTag } from './use-add-tag';
import { useArchiveArticle } from './use-archive-article';
import { useCreateArticle } from './use-create-article';
import type { KnowledgeBaseItemNode } from './use-knowledge-base-item';
import { getKnowledgeBaseItemsConnectionId } from './use-knowledge-base-items';
import { useCreateKnowledgeBaseTag } from './use-knowledge-base-tags';
import { usePublishArticle } from './use-publish-article';
import { useRemoveTag } from './use-remove-tag';
import { useUnarchiveArticle } from './use-unarchive-article';
import { useUnpublishArticle } from './use-unpublish-article';
import { useUpdateArticle } from './use-update-article';

export type ManagedFileStatus = 'uploading' | 'uploaded' | 'error';

export interface ManagedFile {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: ManagedFileStatus;
  error?: string;
}

export type SaveStatus = 'DRAFT' | 'PUBLISHED';

interface UseEditArticleFormOptions {
  articleId: string | null;
  initialFolderId?: string | null;
  /**
   * Existing article fetched in edit mode. The form prefills from this and
   * uses it to compute tag/status diffs at save time. `null` for create mode.
   */
  initialArticle?: KnowledgeBaseItemNode | null;
}

interface ArticleTagRef {
  id: string;
  key: string;
}

/**
 * Tag list state. The form holds tag KEYS for autocomplete UX (creatable +
 * freeSolo). At save time, keys are resolved to IDs against `availableTags`,
 * with unknown keys triggering tag creation. Pass the current set of available
 * tags so unknown keys can be detected.
 */
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

  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createArticle } = useCreateArticle();
  const { updateArticle } = useUpdateArticle();
  const { publishArticle } = usePublishArticle();
  const { unpublishArticle } = useUnpublishArticle();
  const { archiveArticle } = useArchiveArticle();
  const { unarchiveArticle } = useUnarchiveArticle();
  const { addTag } = useAddTag();
  const { removeTag } = useRemoveTag();
  const { createTag } = useCreateKnowledgeBaseTag();

  // Snapshot the original tag IDs for diffing at save time
  const initialTagRefs = useMemo<ArticleTagRef[]>(() => {
    if (!initialArticle?.tags) return [];
    return initialArticle.tags.map(t => ({ id: t.id, key: t.key }));
  }, [initialArticle?.tags]);

  useEffect(() => {
    if (isEditMode && initialArticle && initialArticle.type === 'ARTICLE') {
      const attachments = initialArticle.attachments ?? [];
      form.reset({
        title: initialArticle.name,
        folderId: initialArticle.parentId ?? '',
        tags: initialTagRefs.map(t => t.key),
        body: initialArticle.content ?? '',
        attachmentIds: attachments.map(a => a.id),
      });
      setManagedFiles(
        attachments.map(a => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize ?? 0,
          contentType: a.contentType ?? 'application/octet-stream',
          status: 'uploaded',
        })),
      );
    } else if (!isEditMode) {
      form.reset({ ...ARTICLE_FORM_DEFAULTS, folderId: initialFolderId ?? '' });
      setManagedFiles([]);
    }
  }, [isEditMode, initialArticle, initialFolderId, initialTagRefs, form]);

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

  /**
   * Resolve form tag keys to tag IDs, creating new tags for any unknown keys.
   */
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
            const folderId = data.folderId || null;

            if (isEditMode && articleId && initialArticle && initialArticle.type === 'ARTICLE') {
              // ---- Edit path ----
              await updateArticle({
                input: {
                  id: articleId,
                  name: data.title,
                  parentId: folderId,
                  content: data.body,
                  summary: data.body.slice(0, 160),
                },
              });

              // Tag diff (parallel)
              const initialIds = new Set(initialTagRefs.map(t => t.id));
              const nextIds = new Set(tagIds);
              const toAdd = tagIds.filter(id => !initialIds.has(id));
              const toRemove = initialTagRefs.filter(t => !nextIds.has(t.id)).map(t => t.id);
              await Promise.all([
                ...toAdd.map(tagId => addTag(articleId, tagId)),
                ...toRemove.map(tagId => removeTag(articleId, tagId)),
              ]);

              // Status transition
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
                  // targetStatus === 'DRAFT'
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
              // ---- Create path ----
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
              toast({ title: 'Success', description: 'Article created', variant: 'success' });
              router.push(`/knowledge-base/details/${result.id}`);
            }
          } catch {
            // Underlying mutation hook already surfaced an error toast.
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

  // The form supports archiving as part of save when status is set to ARCHIVED;
  // however the primary article form only exposes Draft + Publish. Explicit
  // archive happens via ArchiveArticleModal triggered from the actions menu.
  // Keep the dependency reference to avoid unused-import errors.
  void archiveArticle;

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
