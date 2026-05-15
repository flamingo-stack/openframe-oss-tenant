'use client';

import { Chevron02DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  ActionsMenuDropdown,
  FieldWrapper,
  FileUpload,
  Input,
  InputTrigger,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { AssignmentsField } from '@/components/assignments';
import type { useArticleTempAttachments } from '../hooks/use-article-temp-attachments';
import { buildFolderTree, KNOWLEDGE_BASE_ROOT_LABEL, useKnowledgeBaseFolders } from '../hooks/use-knowledge-base-items';
import type { KnowledgeBaseTag } from '../hooks/use-knowledge-base-tags';
import type { ArticleFormData } from '../types/article.types';
import { ArticleTagsManager } from './article-tags-manager';
import { buildFolderMenuItemsWithRoot } from './folder-menu-items';
import { MarkdownEditor, SimpleMarkdownRenderer } from './lazy-markdown';

interface ArticleFormFieldsProps {
  form: UseFormReturn<ArticleFormData>;
  availableTags: ReadonlyArray<KnowledgeBaseTag>;
  tempAttachments: ReturnType<typeof useArticleTempAttachments>;
}

export function ArticleFormFields({ form, availableTags, tempAttachments }: ArticleFormFieldsProps) {
  const { control } = form;
  const folders = useKnowledgeBaseFolders();
  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const handleFilesAdded = (incoming: File | File[] | undefined) => {
    if (!incoming) return;
    const fileArray = Array.isArray(incoming) ? incoming : [incoming];
    for (const file of fileArray) {
      tempAttachments.uploadFile(file);
    }
  };

  const managedFiles = useMemo(
    () =>
      tempAttachments.files.map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileSize: f.fileSize,
        contentType: f.contentType,
        status: (f.status === 'existing' ? 'uploaded' : f.status) as 'uploading' | 'uploaded' | 'error',
        error: f.error,
      })),
    [tempAttachments.files],
  );

  const renderPreview = useCallback(
    (source: string) => (
      <div className="custom-preview-wrapper" style={{ height: '100%', overflow: 'auto' }}>
        <SimpleMarkdownRenderer content={source} />
      </div>
    ),
    [],
  );

  return (
    <>
      {/* Title + Folder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-lf)]">
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <div>
              <Input
                type="text"
                label="Article Title"
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter article title"
                error={fieldState.error?.message}
                invalid={!!fieldState.error}
              />
            </div>
          )}
        />

        <Controller
          name="folderId"
          control={control}
          render={({ field }) => {
            const selectedName =
              field.value === null
                ? KNOWLEDGE_BASE_ROOT_LABEL
                : (folders.find(f => f.id === field.value)?.name ?? null);

            return (
              <FieldWrapper label="Folder">
                <ActionsMenuDropdown
                  groups={[{ items: buildFolderMenuItemsWithRoot(tree, target => field.onChange(target.id)) }]}
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  contentClassName="z-[1400]"
                  customTrigger={
                    <InputTrigger
                      selectedLabel={selectedName}
                      placeholder="Select Folder"
                      endIcon={<Chevron02DownIcon className="size-6" />}
                    />
                  }
                />
              </FieldWrapper>
            );
          }}
        />
      </div>

      {/* Tags */}
      <Controller
        name="tags"
        control={control}
        render={({ field }) => (
          <ArticleTagsManager selected={field.value} onChange={field.onChange} availableTags={availableTags} />
        )}
      />

      {/* Body — Markdown Editor */}
      <Controller
        name="body"
        control={control}
        render={({ field }) => (
          <MarkdownEditor
            value={field.value}
            onChange={field.onChange}
            placeholder="Write the article content..."
            height={400}
            renderPreview={renderPreview}
          />
        )}
      />

      <FileUpload
        onChange={handleFilesAdded}
        managedFiles={managedFiles}
        onRemoveManagedFile={tempAttachments.removeFile}
        multiple
        label="Attachments"
        description="(Click Here or Drag and Drop)"
      />

      <Controller
        name="assignments"
        control={control}
        render={({ field }) => <AssignmentsField value={field.value ?? {}} onChange={field.onChange} />}
      />
    </>
  );
}
