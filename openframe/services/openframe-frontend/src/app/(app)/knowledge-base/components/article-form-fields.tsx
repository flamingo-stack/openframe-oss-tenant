'use client';

import { Autocomplete, FileUpload, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import type { ManagedFile } from '../hooks/use-edit-article-form';
import { mockKnowledgeBaseItems } from '../mock-data';
import type { ArticleFormData } from '../types/article.types';
import { ArticleTagsManager } from './article-tags-manager';
import { MarkdownEditor, SimpleMarkdownRenderer } from './lazy-markdown';

interface ArticleFormFieldsProps {
  form: UseFormReturn<ArticleFormData>;
  managedFiles: ManagedFile[];
  onAddFiles: (files: File | File[] | undefined) => void;
  onRemoveFile: (id: string) => void;
}

export function ArticleFormFields({ form, managedFiles, onAddFiles, onRemoveFile }: ArticleFormFieldsProps) {
  const { control } = form;

  const folderOptions = useMemo(
    () =>
      mockKnowledgeBaseItems
        .filter(item => item.type === 'folder')
        .map(folder => ({ label: folder.name, value: folder.id })),
    [],
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
        render={({ field }) => <ArticleTagsManager selected={field.value} onChange={field.onChange} />}
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
