'use client';

import { useState } from 'react';
import { getFullImageUrl } from '@/lib/image-url';
import { useTenantInfo, useUpdateTenantInfo } from '../hooks/use-tenant-info';
import type { UpdateTenantInfoInput } from '../types/tenant-info';
import { EditOrganizationModal } from './edit-organization-modal';
import { MspOrganizationCard } from './msp-organization-card';
import { ProfileCard } from './profile-card';

interface AccountSettingsCardProps {
  onEditProfile: () => void;
  onVerifyEmail: () => void;
}

/**
 * Wrapper that groups the MSP organization row and the user {@link ProfileCard}
 * into a single bordered, rounded container. The wrapper owns the outer border
 * and corner radius; the inner rows are borderless and separated by a divider.
 */
export function AccountSettingsCard({ onEditProfile, onVerifyEmail }: AccountSettingsCardProps) {
  const { data: tenantInfo, isLoading } = useTenantInfo();
  const updateTenantInfo = useUpdateTenantInfo();
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  const orgName = tenantInfo?.name ?? '';
  const orgWebsite = tenantInfo?.website ?? '';
  const orgLogoUrl = getFullImageUrl(tenantInfo?.image?.imageUrl, tenantInfo?.image?.hash);

  const handleSaveOrganization = async (data: UpdateTenantInfoInput) => {
    await updateTenantInfo.mutateAsync(data);
  };

  return (
    <div className="border border-ods-border rounded-md overflow-hidden">
      {/* MSP organization row keeps a transparent background so the page surface
          (ods-bg) shows through, matching the design. */}
      <div className="border-b border-ods-border">
        <MspOrganizationCard
          name={orgName}
          website={orgWebsite}
          logoUrl={orgLogoUrl}
          isLoading={isLoading && !tenantInfo}
          onEditOrganization={() => setIsOrgModalOpen(true)}
        />
      </div>

      <div className="bg-ods-card">
        <ProfileCard onEditProfile={onEditProfile} onVerifyEmail={onVerifyEmail} />
      </div>

      <EditOrganizationModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        organization={{ name: orgName, website: orgWebsite, image: tenantInfo?.image }}
        onSave={handleSaveOrganization}
        isSaving={updateTenantInfo.isPending}
      />
    </div>
  );
}
