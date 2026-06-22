'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useEffect, useState } from 'react';
import { ImageUploader } from '@/app/components/shared/image-uploader';
import { SimpleModal } from '@/app/components/shared/simple-modal';

export interface OrganizationProfile {
  name: string;
  website: string;
  logoUrl?: string;
}

interface EditOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationProfile;
  onSave: (data: OrganizationProfile) => Promise<void> | void;
  isSaving: boolean;
}

export function EditOrganizationModal({ isOpen, onClose, organization, onSave, isSaving }: EditOrganizationModalProps) {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setName(organization.name);
      setWebsite(organization.website);
      setLogoUrl(organization.logoUrl);
    }
  }, [isOpen, organization]);

  const handleSave = useCallback(async () => {
    await onSave({ name, website, logoUrl });
    onClose();
  }, [name, website, logoUrl, onSave, onClose]);

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
      {/* No BE endpoint yet — defer upload so the logo is a local preview only. */}
      <div style={{ maxHeight: '220px' }} className="[&>div]:min-h-0">
        <ImageUploader
          imageUrl={logoUrl}
          onChange={url => setLogoUrl(url)}
          uploadEndpoint="/api/organization/logo"
          height={220}
          objectFit="cover"
          showReplaceButton={true}
          deferUpload={true}
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
