'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ClientView } from '@/app/(app)/settings/ai-settings/types/ai-settings';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';
import {
  type CustomerAppearanceFormValues,
  customerAppearanceSchema,
  getCustomerAppearanceDefaults,
} from './customer-appearance.types';

interface UseCustomerAppearanceFormOptions {
  view: ClientView;
}

export function useCustomerAppearanceForm({ view }: UseCustomerAppearanceFormOptions) {
  const { toast } = useToast();
  const form = useForm<CustomerAppearanceFormValues>({
    resolver: zodResolver(customerAppearanceSchema),
    defaultValues: getCustomerAppearanceDefaults(view),
  });

  const [avatarUrl, setAvatarUrl] = useState(
    getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash),
  );

  // Avatar upload/removal is deferred to commit() so it targets the customer's
  // own ClientView id, not the tenant default `view` borrowed while editing.
  const pendingFileRef = useRef<File | null>(null);
  const pendingRemovalRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // Re-sync form + avatar when the underlying record changes.
  const syncKey = `${view.id}:${view.updatedAt ?? ''}`;
  const lastSyncRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSyncRef.current === syncKey) return;
    lastSyncRef.current = syncKey;
    clearPreview();
    pendingFileRef.current = null;
    pendingRemovalRef.current = false;
    form.reset(getCustomerAppearanceDefaults(view));
    setAvatarUrl(getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash));
  }, [syncKey, view, form, clearPreview]);

  useEffect(() => () => clearPreview(), [clearPreview]);

  const handleAvatarChange = (file: File) => {
    clearPreview();
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
    pendingFileRef.current = file;
    pendingRemovalRef.current = false;
    setAvatarUrl(preview);
  };

  const handleAvatarRemove = () => {
    clearPreview();
    pendingFileRef.current = null;
    // Delete on the backend only if there is a persisted avatar.
    pendingRemovalRef.current = Boolean(view.assistantAvatar);
    setAvatarUrl(undefined);
  };

  // Flush the pending avatar change to the saved ClientView id. Throws on failure.
  const commitAvatar = async (clientViewId: string) => {
    const imageEndpoint = `/api/client-agent-settings/${clientViewId}/image`;
    if (pendingFileRef.current) {
      const uploadedUrl = await uploadWithAuth(imageEndpoint, pendingFileRef.current);
      pendingFileRef.current = null;
      clearPreview();
      // Bust the content-stable endpoint URL so the new image loads.
      setAvatarUrl(getFullImageUrl(uploadedUrl, String(Date.now())));
      toast({ title: 'Avatar updated', description: 'Assistant avatar uploaded', variant: 'success' });
    } else if (pendingRemovalRef.current) {
      await deleteWithAuth(imageEndpoint);
      pendingRemovalRef.current = false;
      toast({ title: 'Avatar removed', description: 'Assistant avatar deleted', variant: 'success' });
    }
  };

  return {
    form,
    avatarUrl,
    handleAvatarChange,
    handleAvatarRemove,
    commitAvatar,
  };
}
