'use client'

import React, { useEffect } from 'react'
import { Button, DetailPageContainer, CardLoader, LoadError, NotFoundError, InfoCard } from '@flamingo-stack/openframe-frontend-core'
import { OrganizationIcon } from '@flamingo-stack/openframe-frontend-core/components/features'
import { useRouter } from 'next/navigation'
import { useOrganizationDetails } from '../hooks/use-organization-details'
import { PencilIcon } from 'lucide-react'
import { useDeleteOrganization } from '../hooks/use-delete-organization'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { featureFlags } from '@lib/feature-flags'

interface OrganizationDetailsViewProps {
  id: string
}

export function OrganizationDetailsView({ id }: OrganizationDetailsViewProps) {
  const router = useRouter()
  const { organization, isLoading, error, fetchOrganizationById } = useOrganizationDetails()
  const { deleteOrganization } = useDeleteOrganization()
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      fetchOrganizationById(id)
    }
  }, [id, fetchOrganizationById])

  const handleBack = () => router.push('/organizations')
  const handleEdit = () => router.push(`/organizations/edit/${id}`)
  const handleDelete = async () => {
    if (!organization) return
    if (organization.isDefault) {
      return
    }
    try {
      await deleteOrganization(organization.id)
      toast({ title: 'Organization deleted', description: `${organization.name} was deleted` })
      router.push('/organizations')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete organization'
      toast({ title: 'Delete failed', description: msg, variant: 'destructive' })
    }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleEdit}
        variant="outline"
        leftIcon={<PencilIcon className="w-5 h-5" />}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px]"
      >
        Edit Organization
      </Button>
      <Button
        onClick={handleDelete}
        variant="outline"
        disabled={organization?.isDefault}
        className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px]"
      >
        Delete
      </Button>
    </div>
  )

  if (isLoading) {
    return <CardLoader items={4} />
  }

  if (error) {
    return <LoadError message={`Error loading organization: ${error}`} />
  }

  if (!organization) {
    return <NotFoundError message="Organization not found" />
  }

  return (
    <DetailPageContainer
      title={organization?.name || 'Organization'}
      backButton={{ label: 'Back to Organizations', onClick: handleBack }}
      headerActions={headerActions}
      padding='none'
      className='pt-6'
    >
      {/* Top summary row */}
      <div className="bg-ods-card border border-ods-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="flex items-center gap-3">
            {featureFlags.organizationImages.displayEnabled() && (
              <OrganizationIcon
                imageUrl={organization?.imageUrl}
                organizationName={organization?.name || 'Organization'}
                size="lg"
                refreshKey={organization?.id}
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
            <div className="text-ods-text-primary text-[18px]">{organization ? new Date(organization.updatedAt).toLocaleString() : '-'}</div>
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
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
            PRIMARY CONTACT
          </h3>
          <InfoCard
            data={{
              items: [
                { label: 'Name', value: organization.primary.name || '-' },
                { label: 'Position', value: organization.primary.title || '-' },
                { label: 'Email', value: organization.primary.email || '-' },
                { label: 'Phone', value: organization.primary.phone || '-' }
              ]
            }}
          />
        </div>

        <div>
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
            BILLING CONTACT
          </h3>
          <InfoCard
            data={{
              items: [
                { label: 'Name', value: organization.billing.name || '-' },
                { label: 'Position', value: organization.billing.title || '-' },
                { label: 'Email', value: organization.billing.email || '-' },
                { label: 'Phone', value: organization.billing.phone || '-' }
              ]
            }}
          />
        </div>

        <div>
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
            TECHNICAL CONTACT
          </h3>
          <InfoCard
            data={{
              items: [
                { label: 'Name', value: organization.technical.name || '-' },
                { label: 'Position', value: organization.technical.title || '-' },
                { label: 'Email', value: organization.technical.email || '-' },
                { label: 'Phone', value: organization.technical.phone || '-' }
              ]
            }}
          />
        </div>
      </div>

      {/* Service Configuration */}
      <div className="mt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
          SERVICE CONFIGURATION
        </h3>
        <InfoCard
          data={{
            items: [
              { label: 'Monthly Recurring Revenue', value: organization.mrrUsd != null ? `$${organization.mrrUsd.toLocaleString()}` : '-' },
              { label: 'Contract', value: organization.contractStart && organization.contractEnd ? `${new Date(organization.contractStart).toLocaleDateString()} - ${new Date(organization.contractEnd).toLocaleDateString()}` : '-' },
            ]
          }}
        />
      </div>

      <div className="mt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
          NOTES
        </h3>
        <div className="flex flex-col gap-3">
          {(organization.notes || []).map((n, i) => (
            <div key={i} className="text-ods-text-primary text-[18px] bg-ods-bg-hover rounded px-3 py-2 border border-ods-border">{n}</div>
          ))}
        </div>
      </div>
    </DetailPageContainer>
  )
}
