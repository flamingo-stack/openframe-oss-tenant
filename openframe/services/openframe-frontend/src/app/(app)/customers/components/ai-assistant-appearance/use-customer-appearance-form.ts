'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
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

  // The avatar lives on the ClientView via a separate REST endpoint, not GraphQL.
  // imageUrl from the API is relative (/images/...), so resolve it for <img src>.
  const imageEndpoint = `/api/client-agent-settings/${view.id}/image`;
  const [avatarUrl, setAvatarUrl] = useState(
    getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash),
  );

  // Re-sync form + avatar when the underlying record changes (initial load,
  // after a save+refetch, or when switching which record we're editing).
  const syncKey = `${view.id}:${view.updatedAt ?? ''}`;
  const lastSyncRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSyncRef.current === syncKey) return;
    lastSyncRef.current = syncKey;
    form.reset(getCustomerAppearanceDefaults(view));
    setAvatarUrl(getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash));
  }, [syncKey, view, form]);

  const handleAvatarChange = async (file: File) => {
    if (!view.id) {
      toast({
        title: 'Save appearance first',
        description: 'Save the custom appearance before uploading an avatar',
        variant: 'destructive',
      });
      return;
    }
    const previous = avatarUrl;
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    try {
      const uploadedUrl = await uploadWithAuth(imageEndpoint, file);
      // The image endpoint URL is content-stable, so the browser would otherwise
      // serve the previously cached avatar. Bust the cache so the freshly
      // uploaded image actually loads.
      setAvatarUrl(getFullImageUrl(uploadedUrl, String(Date.now())));
      toast({ title: 'Avatar updated', description: 'Assistant avatar uploaded', variant: 'success' });
    } catch (err) {
      setAvatarUrl(previous);
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      URL.revokeObjectURL(preview);
    }
  };

  const handleAvatarRemove = async () => {
    if (!view.id) {
      setAvatarUrl(undefined);
      return;
    }
    const previous = avatarUrl;
    setAvatarUrl(undefined);
    try {
      await deleteWithAuth(imageEndpoint);
      toast({ title: 'Avatar removed', description: 'Assistant avatar deleted', variant: 'success' });
    } catch (err) {
      setAvatarUrl(previous);
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to delete avatar',
        variant: 'destructive',
      });
    }
  };

  return {
    form,
    avatarUrl,
    handleAvatarChange,
    handleAvatarRemove,
  };
}
