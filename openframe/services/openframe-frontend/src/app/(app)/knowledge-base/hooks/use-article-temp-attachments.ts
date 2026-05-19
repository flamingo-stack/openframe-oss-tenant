'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useState } from 'react';
import { graphql, useRelayEnvironment } from 'react-relay';
import { commitMutation, type Environment } from 'relay-runtime';
import type { useArticleTempAttachmentsCreateMutation } from '@/__generated__/useArticleTempAttachmentsCreateMutation.graphql';
import type { useArticleTempAttachmentsDeleteAttachmentMutation } from '@/__generated__/useArticleTempAttachmentsDeleteAttachmentMutation.graphql';
import type { useArticleTempAttachmentsDeleteTempMutation } from '@/__generated__/useArticleTempAttachmentsDeleteTempMutation.graphql';

const createTempAttachmentMutation = graphql`
  mutation useArticleTempAttachmentsCreateMutation($input: CreateKnowledgeBaseTempAttachmentInput!) {
    createKnowledgeBaseTempAttachmentUploadUrl(input: $input) {
      tempAttachment {
        id
        fileName
        contentType
        fileSize
        uploadUrl
        createdAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const deleteTempAttachmentMutation = graphql`
  mutation useArticleTempAttachmentsDeleteTempMutation($input: MutationDeleteInput!) {
    deleteKnowledgeBaseTempAttachment(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

const deleteAttachmentMutation = graphql`
  mutation useArticleTempAttachmentsDeleteAttachmentMutation($input: MutationDeleteInput!) {
    deleteKnowledgeBaseAttachment(input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

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
  environment: Environment,
  file: File,
): Promise<{ id: string; fileName: string; fileSize: number; contentType: string }> {
  const contentType = file.type || 'application/octet-stream';

  const response = await new Promise<useArticleTempAttachmentsCreateMutation['response']>((resolve, reject) => {
    commitMutation<useArticleTempAttachmentsCreateMutation>(environment, {
      mutation: createTempAttachmentMutation,
      variables: { input: { fileName: file.name, contentType: file.type || null, fileSize: file.size } },
      onCompleted: (data, errors) => {
        if (errors?.length) {
          reject(new Error(errors[0].message));
          return;
        }
        resolve(data);
      },
      onError: reject,
    });
  });

  const payload = response.createKnowledgeBaseTempAttachmentUploadUrl;
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

async function deleteTempAttachment(environment: Environment, id: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    commitMutation<useArticleTempAttachmentsDeleteTempMutation>(environment, {
      mutation: deleteTempAttachmentMutation,
      variables: { input: { id } },
      onCompleted: (_data, errors) => {
        if (errors?.length) {
          reject(new Error(errors[0].message));
          return;
        }
        resolve();
      },
      onError: reject,
    });
  });
}

async function deleteKnowledgeBaseAttachment(environment: Environment, id: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    commitMutation<useArticleTempAttachmentsDeleteAttachmentMutation>(environment, {
      mutation: deleteAttachmentMutation,
      variables: { input: { id } },
      onCompleted: (_data, errors) => {
        if (errors?.length) {
          reject(new Error(errors[0].message));
          return;
        }
        resolve();
      },
      onError: reject,
    });
  });
}

export function useArticleTempAttachments() {
  const { toast } = useToast();
  const environment = useRelayEnvironment();
  const [files, setFiles] = useState<TempFileEntry[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const uploadFile = useCallback(
    (file: File) => {
      const placeholderId = `pending-${crypto.randomUUID()}`;
      setFiles(prev => [
        ...prev,
        {
          id: placeholderId,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || 'application/octet-stream',
          status: 'uploading',
        },
      ]);

      createTempAttachment(environment, file)
        .then(result => {
          setFiles(prev =>
            prev.map(f => (f.id === placeholderId ? { ...f, id: result.id, status: 'uploaded' as const } : f)),
          );
        })
        .catch(err => {
          const message = err instanceof Error ? err.message : 'Upload failed';
          setFiles(prev =>
            prev.map(f => (f.id === placeholderId ? { ...f, status: 'error' as const, error: message } : f)),
          );
          toast({ title: 'Upload Error', description: message, variant: 'destructive' });
        });
    },
    [environment, toast],
  );

  const removeFile = useCallback(
    (id: string) => {
      if (id.startsWith('pending-')) {
        setFiles(prev => prev.filter(f => f.id !== id));
        return;
      }
      const entry = files.find(f => f.id === id);
      if (entry?.status === 'existing') {
        setFiles(prev => prev.filter(f => f.id !== id));
        setPendingDeleteIds(prev => [...prev, id]);
        return;
      }
      setFiles(prev => prev.filter(f => f.id !== id));
      deleteTempAttachment(environment, id).catch(err => {
        const message = err instanceof Error ? err.message : 'Failed to remove file';
        toast({ title: 'Warning', description: message, variant: 'destructive' });
      });
    },
    [environment, files, toast],
  );

  const initializeExisting = useCallback(
    (
      attachments: ReadonlyArray<{
        id: string;
        fileName: string;
        contentType?: string | null;
        fileSize?: number | null;
      }>,
    ) => {
      setFiles(prev => {
        const existingIds = new Set(prev.map(f => f.id));
        const newEntries = attachments
          .filter(a => !existingIds.has(a.id))
          .map(
            (a): TempFileEntry => ({
              id: a.id,
              fileName: a.fileName,
              fileSize: a.fileSize ?? 0,
              contentType: a.contentType ?? 'application/octet-stream',
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
        await deleteKnowledgeBaseAttachment(environment, id);
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
  }, [environment, pendingDeleteIds, toast]);

  const getTempAttachmentIds = useCallback(
    (): string[] => files.filter(f => f.status === 'uploaded' && !f.id.startsWith('pending-')).map(f => f.id),
    [files],
  );

  const hasPendingDeletes = pendingDeleteIds.length > 0;
  const isUploading = files.some(f => f.status === 'uploading');

  const reset = useCallback(() => {
    setFiles([]);
    setPendingDeleteIds([]);
  }, []);

  return {
    files,
    uploadFile,
    removeFile,
    initializeExisting,
    isUploading,
    getTempAttachmentIds,
    deleteRemovedAttachments,
    hasPendingDeletes,
    reset,
  };
}
