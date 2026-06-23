'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';
import type { AgentAiConfig, ClientView } from '../types/ai-settings';
import {
  type CustomerAiAssistantFormValues,
  type CustomerAiAssistantSubmit,
  customerAiAssistantSchema,
  getCustomerAiAssistantDefaults,
  toCustomerAiAssistantSubmit,
} from '../types/customer-ai-assistant.types';

interface UseCustomerAiAssistantFormOptions {
  aiConfig: AgentAiConfig;
  view: ClientView;
  onSubmit: (payload: CustomerAiAssistantSubmit) => void;
}

export function useCustomerAiAssistantForm({ aiConfig, view, onSubmit }: UseCustomerAiAssistantFormOptions) {
  const { toast } = useToast();
  const form = useForm<CustomerAiAssistantFormValues>({
    resolver: zodResolver(customerAiAssistantSchema),
    defaultValues: getCustomerAiAssistantDefaults(aiConfig, view),
  });

  // The avatar is stored on the ClientView via a separate REST endpoint, not the
  // GraphQL config. imageUrl from the API is relative, so resolve it for <img src>.
  const imageEndpoint = `/api/client-agent-settings/${view.id}/image`;
  const [avatarUrl, setAvatarUrl] = useState(
    getFullImageUrl(view.assistantAvatar?.imageUrl, view.assistantAvatar?.hash),
  );

  const handleAvatarChange = async (file: File) => {
    if (!view.id) {
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

  const handleSubmit = form.handleSubmit(values => onSubmit(toCustomerAiAssistantSubmit(values)));

  return {
    form,
    avatarUrl,
    handleAvatarChange,
    handleAvatarRemove,
    handleSubmit,
  };
}
