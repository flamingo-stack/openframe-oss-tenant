'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/app/(auth)/auth/stores';
import { EditOrganizationModal, type OrganizationProfile } from './edit-organization-modal';
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
  const { toast } = useToast();
  const user = useAuthStore(state => state.user);

  // No BE endpoint yet — organization name is seeded from the auth store, the
  // rest is local-only UI state edited through the Edit Organization modal.
  const [organization, setOrganization] = useState<OrganizationProfile>({
    name: '',
    website: '',
    logoUrl: undefined,
  });
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  useEffect(() => {
    const name = user?.organizationName || user?.tenantName || '';
    setOrganization(prev => (prev.name ? prev : { ...prev, name }));
  }, [user?.organizationName, user?.tenantName]);

  const handleSaveOrganization = useCallback(
    async (data: OrganizationProfile) => {
      // TODO: persist via API once the backend update endpoint is available.
      setIsSavingOrg(true);
      try {
        setOrganization(data);
        toast({
          title: 'Organization Updated',
          description: 'Your organization details have been updated successfully.',
          variant: 'success',
          duration: 3000,
        });
      } finally {
        setIsSavingOrg(false);
      }
    },
    [toast],
  );

  return (
    <div className="border border-ods-border rounded-md overflow-hidden">
      {/* MSP organization row keeps a transparent background so the page surface
          (ods-bg) shows through, matching the design. */}
      <div className="border-b border-ods-border">
        <MspOrganizationCard organization={organization} onEditOrganization={() => setIsOrgModalOpen(true)} />
      </div>

      <div className="bg-ods-card">
        <ProfileCard onEditProfile={onEditProfile} onVerifyEmail={onVerifyEmail} />
      </div>

      <EditOrganizationModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        organization={organization}
        onSave={handleSaveOrganization}
        isSaving={isSavingOrg}
      />
    </div>
  );
}
