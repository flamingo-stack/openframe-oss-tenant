'use client';

import { Autocomplete, FileUpload, Input } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { ManagedFile } from '../hooks/use-edit-article-form';
import { useKnowledgeBaseFolders } from '../hooks/use-knowledge-base-items';
import type { KnowledgeBaseTag } from '../hooks/use-knowledge-base-tags';
import type { ArticleFormData } from '../types/article.types';
import { ArticleTagsManager } from './article-tags-manager';
import { MarkdownEditor, SimpleMarkdownRenderer } from './lazy-markdown';

interface ArticleFormFieldsProps {
  form: UseFormReturn<ArticleFormData>;
  managedFiles: ManagedFile[];
  onAddFiles: (files: File | File[] | undefined) => void;
  onRemoveFile: (id: string) => void;
  /** Existing tags fetched at the form level (passed through to ArticleTagsManager). */
  availableTags: ReadonlyArray<KnowledgeBaseTag>;
}

export function ArticleFormFields({
  form,
  managedFiles,
  onAddFiles,
  onRemoveFile,
  availableTags,
}: ArticleFormFieldsProps) {
  const { control } = form;
  const folders = useKnowledgeBaseFolders();

  const folderOptions = useMemo(
    () => folders.map(folder => ({ label: folder.name, value: folder.id })),
    [folders],
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          render={({ field, fieldState }) => (
            <Autocomplete
              label="Folder"
              options={folderOptions}
              value={field.value || null}
              onChange={val => field.onChange(val ?? '')}
              placeholder="Select folder"
              error={fieldState.error?.message}
              invalid={!!fieldState.error}
            />
          )}
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

      {/* File Upload */}
      <FileUpload
        onChange={onAddFiles}
        managedFiles={managedFiles}
        onRemoveManagedFile={onRemoveFile}
        multiple
        label="Upload Files"
        description="(Click Here or Drag and Drop)"
      />
    </>
  );
}
