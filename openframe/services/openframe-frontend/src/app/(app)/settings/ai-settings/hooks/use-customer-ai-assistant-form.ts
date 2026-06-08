'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';
import {
  type CustomerAiAssistantFormValues,
  customerAiAssistantSchema,
  getCustomerAiAssistantDefaults,
} from '../types/customer-ai-assistant.types';
import type { FaeSettings, UpdateFaeSettingsInput } from '../types/fae-settings';

interface UseCustomerAiAssistantFormOptions {
  settings: FaeSettings;
  onSubmit: (values: UpdateFaeSettingsInput) => void;
}

export function useCustomerAiAssistantForm({ settings, onSubmit }: UseCustomerAiAssistantFormOptions) {
  const { toast } = useToast();
  const form = useForm<CustomerAiAssistantFormValues>({
    resolver: zodResolver(customerAiAssistantSchema),
    defaultValues: getCustomerAiAssistantDefaults(settings),
  });

  // The avatar is stored via a separate REST endpoint, not the settings GraphQL.
  // imageUrl from the API is relative (/images/...), so resolve it for <img src>.
  const imageEndpoint = `/api/fae-settings/${settings.id}/image`;
  const [avatarUrl, setAvatarUrl] = useState(
    getFullImageUrl(settings.assistantAvatar?.imageUrl, settings.assistantAvatar?.hash),
  );

  const handleAvatarChange = async (file: File) => {
    if (!settings.id) {
      toast({
        title: 'Save settings first',
        description: 'Save the assistant before uploading an avatar',
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
    if (!settings.id) {
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

  const quickActions = useFieldArray({ control: form.control, name: 'quickActions' });

  const addQuickAction = () => quickActions.append({ name: '', instructions: '' });

  const handleSubmit = form.handleSubmit(values => onSubmit(values));

  return {
    form,
    avatarUrl,
    handleAvatarChange,
    handleAvatarRemove,
    quickActionFields: quickActions.fields,
    addQuickAction,
    removeQuickAction: quickActions.remove,
    handleSubmit,
  };
}
