'use client';

import {
  Autocomplete,
  FileUpload,
  Input,
  Label,
  SquareAvatar,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useMemo, useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { getFullImageUrl } from '@/lib/image-url';
import type { useTempAttachments } from '../../hooks/use-temp-attachments';
import type { AssigneeOption } from '../../hooks/use-ticket-options';
import { useAssigneeOptions, useDeviceOptions, useOrganizationOptions } from '../../hooks/use-ticket-options';
import type { CreateTicketFormData } from '../../types/create-ticket.types';
import { MarkdownEditor, SimpleMarkdownRenderer } from './lazy-markdown';
import { TicketTagsManager } from './ticket-tags-manager';

interface TicketFormFieldsProps {
  form: UseFormReturn<CreateTicketFormData>;
  tempAttachments: ReturnType<typeof useTempAttachments>;
  isFaeForm?: boolean;
  isEditMode?: boolean;
}

export function TicketFormFields({
  form,
  tempAttachments,
  isFaeForm = false,
  isEditMode = false,
}: TicketFormFieldsProps) {
  const { control, watch, resetField } = form;

  const [orgSearch, setOrgSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const debouncedOrgSearch = useDebounce(orgSearch, 300);
  const debouncedDeviceSearch = useDebounce(deviceSearch, 300);

  const selectedOrgId = watch('organizationId');
  const selectedDeviceId = watch('deviceId');
  const lockOrgAndDevice = isEditMode && !!selectedDeviceId;
  const organizationOptions = useOrganizationOptions(debouncedOrgSearch);
  const deviceOptions = useDeviceOptions(selectedOrgId ?? undefined, debouncedDeviceSearch);
  const assigneeOptions = useAssigneeOptions();
  const renderPreview = useCallback(
    (source: string) => (
      <div className="custom-preview-wrapper" style={{ height: '100%', overflow: 'auto' }}>
        <SimpleMarkdownRenderer content={source} />
      </div>
    ),
    [],
  );

  const handleFilesAdded = (files: File | File[] | undefined) => {
    if (!files) return;
    const fileArray = Array.isArray(files) ? files : [files];
    for (const file of fileArray) {
      tempAttachments.uploadFile(file);
    }
  };

  // Map 'existing' status to 'uploaded' for the FileUpload component
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

  return (
    <>
      {/* Title */}
      <Controller
        name="title"
        control={control}
        render={({ field, fieldState }) => (
          <div>
            <Label className="text-lg font-['DM_Sans'] font-medium text-ods-text-primary">Title</Label>
            <Input
              type="text"
              value={field.value}
              onChange={field.onChange}
              placeholder="Enter Ticket Name Here"
              error={fieldState.error?.message}
              invalid={!!fieldState.error}
            />
          </div>
        )}
      />

      {/* Organization, Device, Assigned — 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Controller
          name="organizationId"
          control={control}
          render={({ field, fieldState }) => (
            <Autocomplete
              label="Organization"
              options={organizationOptions.options}
              value={field.value ?? null}
              onChange={val => {
                field.onChange(val);
                resetField('deviceId');
                setDeviceSearch('');
              }}
              onInputChange={setOrgSearch}
              placeholder="Select Organization"
              loading={organizationOptions.isLoading}
              disabled={isFaeForm || lockOrgAndDevice}
              disableClientFilter
              error={fieldState.error?.message}
              invalid={!!fieldState.error}
            />
          )}
        />

        <Controller
          name="deviceId"
          control={control}
          render={({ field, fieldState }) => (
            <Autocomplete
              label="Device"
              options={deviceOptions.options}
              value={field.value ?? null}
              onChange={val => field.onChange(val)}
              onInputChange={setDeviceSearch}
              placeholder={selectedOrgId ? 'Select Device' : 'Select Organization first'}
              loading={deviceOptions.isLoading}
              disabled={isFaeForm || !selectedOrgId || lockOrgAndDevice}
              disableClientFilter
              error={fieldState.error?.message}
              invalid={!!fieldState.error}
            />
          )}
        />

        <Controller
          name="assignedTo"
          control={control}
          render={({ field }) => {
            const selectedAssignee = assigneeOptions.options.find(o => o.value === field.value) as
              | AssigneeOption
              | undefined;
            return (
              <Autocomplete
                label="Assigned"
                options={assigneeOptions.options}
                value={field.value ?? null}
                onChange={val => field.onChange(val)}
                placeholder="Select Assignee"
                loading={assigneeOptions.isLoading}
                startAdornment={
                  selectedAssignee ? (
                    <SquareAvatar
                      src={getFullImageUrl(selectedAssignee.imageUrl)}
                      alt={selectedAssignee.label}
                      fallback={selectedAssignee.label}
                      size="sm"
                      variant="round"
                      className="h-6 w-6"
                    />
                  ) : undefined
                }
                renderOption={option => {
                  const assignee = option as AssigneeOption;
                  return (
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <SquareAvatar
                        src={getFullImageUrl(assignee.imageUrl)}
                        alt={assignee.label}
                        fallback={assignee.label}
                        size="sm"
                        variant="round"
                        className="h-6 w-6 shrink-0"
                      />
                      <span className="truncate">{assignee.label}</span>
                    </div>
                  );
                }}
              />
            );
          }}
        />
      </div>

      {/* Labels / Tags */}
      <Controller
        name="labelIds"
        control={control}
        render={({ field }) => <TicketTagsManager selectedIds={field.value} onChange={val => field.onChange(val)} />}
      />

      {/* File Upload — managed mode with temp attachments */}
      <FileUpload
        onChange={handleFilesAdded}
        managedFiles={managedFiles}
        onRemoveManagedFile={tempAttachments.removeFile}
        multiple
        label="Upload Files"
        description="(Click Here or Drag and Drop)"
      />

      {/* Description — Markdown Editor */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <MarkdownEditor
            value={field.value}
            onChange={field.onChange}
            placeholder="Ticket Description"
            height={500}
            renderPreview={renderPreview}
            disabled={isFaeForm}
          />
        )}
      />
    </>
  );
}
