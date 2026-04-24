'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import {
  CREATE_TEMP_ATTACHMENT_UPLOAD_URL,
  DELETE_TEMP_ATTACHMENT,
  DELETE_TICKET_ATTACHMENT,
} from '../queries/ticket-queries';
import type { TempAttachmentPayload } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';

export type TempFileStatus = 'uploading' | 'uploaded' | 'error' | 'existing';

export interface TempFileEntry {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: TempFileStatus;
  error?: string;
}

async function createTempAttachment(
  file: File,
): Promise<{ id: string; fileName: string; fileSize: number; contentType: string }> {
  const contentType = file.type || 'application/octet-stream';

  const response = await apiClient.post<GraphQlResponse<{ createTempAttachmentUploadUrl: TempAttachmentPayload }>>(
    API_ENDPOINTS.GRAPHQL,
    {
      query: CREATE_TEMP_ATTACHMENT_UPLOAD_URL,
      variables: { input: { fileName: file.name, contentType: file.type || undefined, fileSize: file.size } },
    },
  );

  const data = extractGraphQlData(response);
  const payload = data.createTempAttachmentUploadUrl;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }
  if (!payload.tempAttachment) {
    throw new Error('No attachment data returned');
  }

  const { id, uploadUrl } = payload.tempAttachment;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  return { id, fileName: file.name, fileSize: file.size, contentType };
}

async function deleteTempAttachment(id: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.GRAPHQL, {
    query: DELETE_TEMP_ATTACHMENT,
    variables: { input: { id } },
  });
}

async function deleteTicketAttachment(id: string): Promise<void> {
  await apiClient.post(API_ENDPOINTS.GRAPHQL, {
    query: DELETE_TICKET_ATTACHMENT,
    variables: { input: { id } },
  });
}

export function useTempAttachments() {
  const { toast } = useToast();
  const [files, setFiles] = useState<TempFileEntry[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: createTempAttachment,
    onMutate: (file: File) => {
      const placeholder: TempFileEntry = {
        id: `pending-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
        status: 'uploading',
      };
      setFiles(prev => [...prev, placeholder]);
      return { placeholderId: placeholder.id };
    },
    onSuccess: (result, _file, context) => {
      setFiles(prev =>
        prev.map(f => (f.id === context?.placeholderId ? { ...f, id: result.id, status: 'uploaded' as const } : f)),
      );
    },
    onError: (err, _file, context) => {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setFiles(prev =>
        prev.map(f => (f.id === context?.placeholderId ? { ...f, status: 'error' as const, error: message } : f)),
      );
      toast({ title: 'Upload Error', description: message, variant: 'destructive' });
    },
  });

  const removeTempMutation = useMutation({
    mutationFn: deleteTempAttachment,
    onSuccess: (_data, id) => {
      setFiles(prev => prev.filter(f => f.id !== id));
    },
    onError: (err, id) => {
      // Remove from UI anyway — backend cleanup job handles orphans
      setFiles(prev => prev.filter(f => f.id !== id));
      const message = err instanceof Error ? err.message : 'Failed to remove file';
      toast({ title: 'Warning', description: message, variant: 'destructive' });
    },
  });

  const uploadFile = useCallback(
    (file: File) => {
      uploadMutation.mutate(file);
    },
    [uploadMutation],
  );

  const removeFile = useCallback(
    (id: string) => {
      if (id.startsWith('pending-')) {
        setFiles(prev => prev.filter(f => f.id !== id));
        return;
      }
      const entry = files.find(f => f.id === id);
      if (entry?.status === 'existing') {
        // Defer deletion — just remove from UI and track the ID
        setFiles(prev => prev.filter(f => f.id !== id));
        setPendingDeleteIds(prev => [...prev, id]);
      } else {
        removeTempMutation.mutate(id);
      }
    },
    [files, removeTempMutation],
  );

  const initializeExisting = useCallback(
    (attachments: Array<{ id: string; fileName: string; contentType: string; fileSize: number }>) => {
      setFiles(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newEntries = attachments
          .filter(a => !existingIds.has(a.id))
          .map(
            (a): TempFileEntry => ({
              id: a.id,
              fileName: a.fileName,
              fileSize: a.fileSize ?? 0,
              contentType: a.contentType,
              status: 'existing',
            }),
          );
        return newEntries.length ? [...prev, ...newEntries] : prev;
      });
    },
    [],
  );

  const deleteRemovedAttachments = useCallback(async () => {
    const errors: string[] = [];
    for (const id of pendingDeleteIds) {
      try {
        await deleteTicketAttachment(id);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Failed to delete attachment ${id}`);
      }
    }
    setPendingDeleteIds([]);
    if (errors.length) {
      toast({
        title: 'Warning',
        description: `Some attachments could not be removed: ${errors.join(', ')}`,
        variant: 'destructive',
      });
    }
  }, [pendingDeleteIds, toast]);

  const getTempAttachmentIds = useCallback((): string[] => {
    return files.filter(f => f.status === 'uploaded' && !f.id.startsWith('pending-')).map(f => f.id);
  }, [files]);

  const hasPendingDeletes = pendingDeleteIds.length > 0;

  const reset = useCallback(() => {
    setFiles([]);
    setPendingDeleteIds([]);
  }, []);

  return {
    files,
    uploadFile,
    removeFile,
    initializeExisting,
    isUploading: uploadMutation.isPending,
    getTempAttachmentIds,
    deleteRemovedAttachments,
    hasPendingDeletes,
    reset,
  };
}
