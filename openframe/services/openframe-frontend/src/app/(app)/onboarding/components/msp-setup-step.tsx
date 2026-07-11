'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core';
import { CheckCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ImageUploader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';
import {
  TENANT_IMAGE_ENDPOINT,
  tenantInfoQueryKeys,
  useTenantInfo,
  useUpdateTenantInfo,
} from '../../settings/hooks/use-tenant-info';
import type { TenantImage } from '../../settings/types/tenant-info';
import { useStepActionState } from '../use-step-action-state';

/**
 * Inner body of the "Complete MSP Setup" onboarding step. Reuses the same tenant-info
 * data layer and core components as the settings "Edit Organization" form
 * ({@link ../../settings/components/edit-organization-modal}) so both stay in sync.
 */
export function MspSetupStep({
  onComplete,
  completed,
  completing,
}: {
  onComplete?: () => void;
  completed?: boolean;
  completing?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantInfo } = useTenantInfo();
  const updateTenantInfo = useUpdateTenantInfo();

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageHash, setImageHash] = useState<string | undefined>();
  const [isImageBusy, setIsImageBusy] = useState(false);

  useEffect(() => {
    if (!tenantInfo) return;
    setName(tenantInfo.name ?? '');
    setWebsite(tenantInfo.website ?? '');
    setImageUrl(tenantInfo.image?.imageUrl ?? undefined);
    setImageHash(tenantInfo.image?.hash ?? undefined);
  }, [tenantInfo]);

  const handleImageChange = useCallback(
    async (file: File) => {
      setIsImageBusy(true);
      try {
        const uploadedUrl = await uploadWithAuth(TENANT_IMAGE_ENDPOINT, file);
        const bust = String(Date.now());
        setImageUrl(uploadedUrl);
        setImageHash(bust);
        queryClient.setQueryData(tenantInfoQueryKeys.all, (prev: { image?: TenantImage | null } | null | undefined) =>
          prev ? { ...prev, image: { imageUrl: uploadedUrl, hash: bust } } : prev,
        );
        toast({ title: 'Upload successful', description: 'Organization logo has been updated', variant: 'success' });
      } catch (err) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : 'Failed to upload image',
          variant: 'destructive',
        });
      } finally {
        setIsImageBusy(false);
      }
    },
    [toast, queryClient],
  );

  const handleImageRemove = useCallback(async () => {
    setIsImageBusy(true);
    try {
      await deleteWithAuth(TENANT_IMAGE_ENDPOINT);
      setImageUrl(undefined);
      setImageHash(undefined);
      queryClient.setQueryData(tenantInfoQueryKeys.all, (prev: { image?: TenantImage | null } | null | undefined) =>
        prev ? { ...prev, image: null } : prev,
      );
      toast({ title: 'Delete successful', description: 'Organization logo has been removed', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to remove image',
        variant: 'destructive',
      });
    } finally {
      setIsImageBusy(false);
    }
  }, [toast, queryClient]);

  const handleSave = useCallback(() => {
    // A successful save completes the onboarding step (in addition to the explicit
    // "Mark as Complete" button) — but only the first time, so re-saving an
    // already-complete step doesn't re-fire completion.
    updateTenantInfo.mutate({ name, website }, { onSuccess: () => !completed && onComplete?.() });
  }, [name, website, updateTenantInfo, onComplete, completed]);

  const displayImageUrl = getFullImageUrl(imageUrl, imageHash);
  const isSaving = updateTenantInfo.isPending;
  const actions = useStepActionState({ completing, primaryBusy: isSaving });

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      {/* Name + Website (left) / Logo (right) */}
      <div className="flex w-full flex-col items-start gap-[var(--spacing-system-l)] md:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
          <Input
            id="msp-org-name"
            label="Organization Name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isSaving}
            placeholder="Organization name"
          />
          <Input
            id="msp-org-website"
            label="Organization Website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            disabled={isSaving}
            placeholder="www.example.com"
          />
        </div>

        <div className="w-full min-w-0 flex-1 self-stretch">
          <ImageUploader
            fieldLabel="Organization Logo"
            value={displayImageUrl}
            onChange={handleImageChange}
            onRemove={handleImageRemove}
            loading={isImageBusy}
            objectFit="cover"
            maxSize={5 * 1024 * 1024}
            label="Upload organization logo"
            description="Click to upload or drag and drop"
            alt={name || 'Organization logo'}
            // Pin height only on desktop, where it aligns with the two-input column on the
            // left. On mobile the columns stack, so let the dropzone use its natural height.
            dropzoneClassName="md:h-[148px]"
          />
        </div>
      </div>

      {/* Mark as Complete + Save — aligned to the right, matching the design grid */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-1 md:block" />
        {!completed ? (
          <Button
            variant="outline"
            leftIcon={<CheckCircleIcon className="size-5" />}
            onClick={() => {
              actions.begin('complete');
              onComplete?.();
            }}
            loading={actions.complete.loading}
            disabled={actions.complete.disabled}
            className="w-full md:flex-1"
          >
            Mark as Complete
          </Button>
        ) : (
          // Keep the completed step's primary button its own width — don't let it
          // stretch into the removed "Mark as Complete" slot.
          <div className="hidden md:block md:flex-1" aria-hidden />
        )}
        <Button
          variant="accent"
          onClick={() => {
            actions.begin('primary');
            handleSave();
          }}
          loading={actions.primary.loading}
          disabled={actions.primary.disabled}
          className="w-full md:flex-1"
        >
          Save Organization
        </Button>
      </div>
    </div>
  );
}
