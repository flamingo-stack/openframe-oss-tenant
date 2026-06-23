'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { ImageUploader } from '@/app/components/shared/image-uploader';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';
import { TENANT_IMAGE_ENDPOINT, tenantInfoQueryKeys } from '../hooks/use-tenant-info';
import type { TenantImage, UpdateTenantInfoInput } from '../types/tenant-info';

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: { name: string; website: string; image?: TenantImage | null };
  onSave: (data: UpdateTenantInfoInput) => Promise<void>;
  isSaving: boolean;
}

export function EditOrganizationModal({ isOpen, onClose, organization, onSave, isSaving }: EditOrganizationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageHash, setImageHash] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setName(organization.name);
      setWebsite(organization.website);
      setImageUrl(organization.image?.imageUrl ?? undefined);
      setImageHash(organization.image?.hash ?? undefined);
    }
  }, [isOpen, organization]);

  const handleAuthenticatedUpload = useCallback(
    async (file: File): Promise<string> => {
      const uploadedUrl = await uploadWithAuth(TENANT_IMAGE_ENDPOINT, file);
      toast({
        title: 'Upload successful',
        description: 'Organization logo has been updated',
        variant: 'success',
      });
      // The image path is stable across uploads, so push the new URL with a fresh
      // cache-bust straight into the tenant-info query cache — this updates the org
      // card avatar immediately without a stale-read race on a separate refetch.
      const bust = String(Date.now());
      setImageUrl(uploadedUrl);
      setImageHash(bust);
      queryClient.setQueryData(tenantInfoQueryKeys.all, (prev: { image?: TenantImage | null } | null | undefined) =>
        prev ? { ...prev, image: { imageUrl: uploadedUrl, hash: bust } } : prev,
      );
      return uploadedUrl;
    },
    [toast, queryClient],
  );

  const handleAuthenticatedDelete = useCallback(async (): Promise<void> => {
    await deleteWithAuth(TENANT_IMAGE_ENDPOINT);
    setImageUrl(undefined);
    setImageHash(undefined);
    queryClient.setQueryData(tenantInfoQueryKeys.all, (prev: { image?: TenantImage | null } | null | undefined) =>
      prev ? { ...prev, image: null } : prev,
    );
    toast({
      title: 'Delete successful',
      description: 'Organization logo has been removed',
      variant: 'success',
    });
  }, [toast, queryClient]);

  const handleSave = useCallback(async () => {
    const saved = await onSave({ name, website }).then(
      () => true,
      () => false,
    );
    if (saved) onClose();
  }, [name, website, onSave, onClose]);

  const displayImageUrl = getFullImageUrl(imageUrl, imageHash);

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Edit Organization"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-12 bg-ods-card border-ods-border text-ods-text-primary font-bold text-lg hover:bg-ods-bg"
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-12 bg-ods-accent text-ods-card font-bold text-lg hover:bg-ods-accent/90"
          >
            {isSaving ? 'Saving...' : 'Update Organization'}
          </Button>
        </>
      }
    >
      <div style={{ maxHeight: '220px' }} className="[&>div]:min-h-0">
        <ImageUploader
          imageUrl={displayImageUrl}
          onChange={url => setImageUrl(url)}
          uploadEndpoint={TENANT_IMAGE_ENDPOINT}
          onUpload={handleAuthenticatedUpload}
          onDelete={handleAuthenticatedDelete}
          height={220}
          objectFit="cover"
          showReplaceButton={true}
          deferUpload={false}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-org-name" className="text-ods-text-primary text-lg font-medium">
          Company Name
        </Label>
        <Input
          id="edit-org-name"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isSaving}
          placeholder="Company name"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="edit-org-website" className="text-ods-text-primary text-lg font-medium">
          Company Website
        </Label>
        <Input
          id="edit-org-website"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          disabled={isSaving}
          placeholder="www.example.com"
        />
      </div>
    </SimpleModal>
  );
}
