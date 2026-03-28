'use client';

import {
  Button,
  CardLoader,
  DetailPageContainer,
  InfoCard,
  LoadError,
  NotFoundError,
} from '@flamingo-stack/openframe-frontend-core';
import { OrganizationIcon } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  BoxArchiveIcon,
  Loading01Icon,
  PenEditIcon,
  Refresh01RightIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useOrganizationArchive } from '../hooks/use-organization-archive';
import { organizationDetailsQueryKeys, useOrganizationDetails } from '../hooks/use-organization-details';
import { organizationsQueryKeys } from '../hooks/use-organizations';
import { ArchiveOrganizationModal } from './archive-organization-modal';
import { RestoreOrganizationModal } from './restore-organization-modal';

interface OrganizationDetailsViewProps {
  id: string;
}

export function OrganizationDetailsView({ id }: OrganizationDetailsViewProps) {
  const router = useRouter();
  const { organization, isLoading, error } = useOrganizationDetails(id);
  const { checkCanArchive, archiveOrganization, restoreOrganization } = useOrganizationArchive();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [canArchive, setCanArchive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isArchived = organization?.status === 'ARCHIVED';

  const handleBack = () => router.push(isArchived ? '/organizations?tab=archived' : '/organizations');
  const handleEdit = () => router.push(`/organizations/edit/${id}`);

  const handleArchiveClick = async () => {
    if (!organization) return;
    setIsChecking(true);
    try {
      const result = await checkCanArchive(organization.organizationId);
      setCanArchive(result);
      setArchiveModalOpen(true);
    } catch {
      setCanArchive(false);
      setArchiveModalOpen(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!organization) return;
    setIsPending(true);
    try {
      await archiveOrganization(organization.organizationId);
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: organizationDetailsQueryKeys.detail(id) });
      toast({ title: 'Organization archived', description: `${organization.name} was archived` });
      router.push('/organizations?tab=archived');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to archive organization';
      toast({ title: 'Archive failed', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!organization) return;
    setIsPending(true);
    try {
      await restoreOrganization(organization.organizationId);
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: organizationDetailsQueryKeys.detail(id) });
      toast({ title: 'Organization restored', description: `${organization.name} was restored` });
      router.push('/organizations');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to restore organization';
      toast({ title: 'Restore failed', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleEdit}
        variant="outline"
        leftIcon={<PenEditIcon size={20} />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] text-h3"
      >
        Edit Organization
      </Button>
      {isArchived ? (
        <Button
          onClick={() => setRestoreModalOpen(true)}
          variant="outline"
          leftIcon={<Refresh01RightIcon size={20} />}
          disabled={organization?.isDefault}
          className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] text-h3"
        >
          Restore
        </Button>
      ) : (
        <Button
          onClick={handleArchiveClick}
          variant="outline"
          leftIcon={isChecking ? <Loading01Icon size={20} className="animate-spin" /> : <BoxArchiveIcon size={20} />}
          disabled={organization?.isDefault || isChecking}
          className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] text-h3"
        >
          Archive
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return <CardLoader items={4} />;
  }

  if (error) {
    return <LoadError message={`Error loading organization: ${error}`} />;
  }

  if (!organization) {
    return <NotFoundError message="Organization not found" />;
  }

  return (
    <>
      <DetailPageContainer
        title={organization?.name || 'Organization'}
        backButton={{
          label: isArchived ? 'Back to Archived Organizations' : 'Back to Organizations',
          onClick: handleBack,
        }}
        headerActions={headerActions}
        padding="none"
      >
        {/* Top summary row */}
        <div className="bg-ods-card border border-ods-border rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="flex items-center gap-3">
              {featureFlags.organizationImages.displayEnabled() && (
                <OrganizationIcon
                  imageUrl={getFullImageUrl(organization?.imageUrl)}
                  organizationName={organization?.name || 'Organization'}
                  size="lg"
                />
              )}
              <div>
                <div className="text-ods-text-primary text-[18px]">{organization?.industry || '-'}</div>
                <div className="text-ods-text-secondary text-sm">Category</div>
              </div>
            </div>
            <div>
              <div className="text-ods-text-primary text-[18px]">{organization?.website || '-'}</div>
              <div className="text-ods-text-secondary text-sm">Website</div>
            </div>
            <div>
              <div className="text-ods-text-primary text-[18px]">{organization?.employees ?? '-'}</div>
              <div className="text-ods-text-secondary text-sm">Employees</div>
            </div>
            <div>
              <div className="text-ods-text-primary text-[18px]">
                {organization ? new Date(organization.updatedAt).toLocaleString() : '-'}
              </div>
              <div className="text-ods-text-secondary text-sm">Updated</div>
            </div>
          </div>

          <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-ods-text-primary text-[18px]">{organization?.physicalAddress || '-'}</div>
              <div className="text-ods-text-secondary text-sm mb-2">Physical Address</div>
            </div>
            <div>
              <div className="text-ods-text-primary text-[18px]">{organization?.mailingAddress || '-'}</div>
              <div className="text-ods-text-secondary text-sm mb-2">Mailing Address</div>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div>
            <h3 className="text-h5 text-ods-text-secondary">PRIMARY CONTACT</h3>
            <InfoCard
              data={{
                items: [
                  { label: 'Name', value: organization.primary.name || '-' },
                  { label: 'Position', value: organization.primary.title || '-' },
                  { label: 'Email', value: organization.primary.email || '-' },
                  { label: 'Phone', value: organization.primary.phone || '-' },
                ],
              }}
            />
          </div>

          <div>
            <h3 className="text-h5 text-ods-text-secondary">BILLING CONTACT</h3>
            <InfoCard
              data={{
                items: [
                  { label: 'Name', value: organization.billing.name || '-' },
                  { label: 'Position', value: organization.billing.title || '-' },
                  { label: 'Email', value: organization.billing.email || '-' },
                  { label: 'Phone', value: organization.billing.phone || '-' },
                ],
              }}
            />
          </div>

          <div>
            <h3 className="text-h5 text-ods-text-secondary">TECHNICAL CONTACT</h3>
            <InfoCard
              data={{
                items: [
                  { label: 'Name', value: organization.technical.name || '-' },
                  { label: 'Position', value: organization.technical.title || '-' },
                  { label: 'Email', value: organization.technical.email || '-' },
                  { label: 'Phone', value: organization.technical.phone || '-' },
                ],
              }}
            />
          </div>
        </div>

        {/* Service Configuration */}
        <div className="mt-6">
          <h3 className="text-h5 text-ods-text-secondary">SERVICE CONFIGURATION</h3>
          <InfoCard
            data={{
              items: [
                {
                  label: 'Monthly Recurring Revenue',
                  value: organization.mrrUsd != null ? `$${organization.mrrUsd.toLocaleString()}` : '-',
                },
                {
                  label: 'Contract',
                  value:
                    organization.contractStart && organization.contractEnd
                      ? `${new Date(organization.contractStart).toLocaleDateString()} - ${new Date(organization.contractEnd).toLocaleDateString()}`
                      : '-',
                },
              ],
            }}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-h5 text-ods-text-secondary">NOTES</h3>
          <div className="flex flex-col gap-3">
            {(organization.notes || []).map((n, i) => (
              <div
                key={i}
                className="text-ods-text-primary text-[18px] bg-ods-bg-hover rounded px-3 py-2 border border-ods-border"
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </DetailPageContainer>

      <ArchiveOrganizationModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        canArchive={canArchive}
        onConfirm={handleArchiveConfirm}
        isPending={isPending}
      />

      <RestoreOrganizationModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        onConfirm={handleRestoreConfirm}
        isPending={isPending}
      />
    </>
  );
}
