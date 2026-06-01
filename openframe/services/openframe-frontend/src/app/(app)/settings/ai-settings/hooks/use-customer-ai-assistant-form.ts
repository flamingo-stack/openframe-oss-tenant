'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
  const form = useForm<CustomerAiAssistantFormValues>({
    resolver: zodResolver(customerAiAssistantSchema),
    defaultValues: getCustomerAiAssistantDefaults(settings),
  });

  // Avatar uploads through a separate REST endpoint, so it lives outside the
  // GraphQL form values. TODO: wire to /api/fae-settings/{id}/image on save.
  const [avatarUrl, setAvatarUrl] = useState(settings.assistantAvatar?.imageUrl);
  const [, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleAvatarRemove = () => {
    setAvatarFile(null);
    setAvatarUrl(undefined);
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
