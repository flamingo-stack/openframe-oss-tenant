'use client'

import React, { useEffect } from 'react'
import { Button, DetailPageContainer, Card, Label, StatusTag } from '@flamingo/ui-kit'
import { useRouter } from 'next/navigation'
import { useOrganizationDetails } from '../hooks/use-organization-details'
import { PencilIcon } from 'lucide-react'

interface OrganizationDetailsViewProps {
  organizationId: string
}

export function OrganizationDetailsView({ organizationId }: OrganizationDetailsViewProps) {
  const router = useRouter()
  const { organization, isLoading, error, fetchOrganizationById } = useOrganizationDetails()

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationById(organizationId)
    }
  }, [organizationId, fetchOrganizationById])

  const handleBack = () => router.push('/organizations')
  const handleEdit = () => router.push(`/organizations/edit/${organizationId}`)

  const headerActions = (
    <Button
      onClick={handleEdit}
      variant="outline"
      leftIcon={<PencilIcon className="w-5 h-5" />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-3 rounded-[6px] font-['DM_Sans'] font-bold text-[18px]"
    >
      Edit Organization
    </Button>
  )

  return (
    <DetailPageContainer
      title={organization?.name || 'Organization'}
      backButton={{ label: 'Back to Organizations', onClick: handleBack }}
      headerActions={headerActions}
      padding='none'
      className='pt-6'
    >
      {/* Top summary row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Card className="bg-ods-card border border-ods-border p-4 flex flex-col gap-2">
          <div className="text-ods-text-secondary text-sm">Category</div>
          <div className="text-ods-text-primary text-[18px]">{organization?.industry || '-'}</div>
        </Card>
        <Card className="bg-ods-card border border-ods-border p-4 flex flex-col gap-2">
          <div className="text-ods-text-secondary text-sm">Website</div>
          <div className="text-ods-text-primary text-[18px]">{organization?.website || '-'}</div>
        </Card>
        <Card className="bg-ods-card border border-ods-border p-4 flex flex-col gap-2">
          <div className="text-ods-text-secondary text-sm">Employees</div>
          <div className="text-ods-text-primary text-[18px]">{organization?.employees ?? '-'}</div>
        </Card>
        <Card className="bg-ods-card border border-ods-border p-4 flex flex-col gap-2">
          <div className="text-ods-text-secondary text-sm">Updated</div>
          <div className="text-ods-text-primary text-[18px]">{organization ? new Date(organization.updatedAt).toLocaleString() : '-'}</div>
        </Card>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-sm mb-2">Physical Address</div>
          <div className="text-ods-text-primary">{organization?.physicalAddress || '-'}</div>
        </Card>
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-sm mb-2">Mailing Address</div>
          <div className="text-ods-text-primary">{organization?.mailingAddress || '-'}</div>
        </Card>
      </div>

      {/* Contacts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-xs">PRIMARY CONTACT</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Label className="text-ods-text-secondary">Name</Label><div>{organization?.primary.name || '-'}</div>
            <Label className="text-ods-text-secondary">Position</Label><div>{organization?.primary.title || '-'}</div>
            <Label className="text-ods-text-secondary">Mail</Label><div>{organization?.primary.email || '-'}</div>
            <Label className="text-ods-text-secondary">Phone</Label><div>{organization?.primary.phone || '-'}</div>
          </div>
        </Card>
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-xs">BILLING CONTACT</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Label className="text-ods-text-secondary">Name</Label><div>{organization?.billing.name || '-'}</div>
            <Label className="text-ods-text-secondary">Position</Label><div>{organization?.billing.title || '-'}</div>
            <Label className="text-ods-text-secondary">Mail</Label><div>{organization?.billing.email || '-'}</div>
            <Label className="text-ods-text-secondary">Phone</Label><div>{organization?.billing.phone || '-'}</div>
          </div>
        </Card>
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-xs">TECHNICAL CONTACT</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Label className="text-ods-text-secondary">Name</Label><div>{organization?.technical.name || '-'}</div>
            <Label className="text-ods-text-secondary">Position</Label><div>{organization?.technical.title || '-'}</div>
            <Label className="text-ods-text-secondary">Mail</Label><div>{organization?.technical.email || '-'}</div>
            <Label className="text-ods-text-secondary">Phone</Label><div>{organization?.technical.phone || '-'}</div>
          </div>
        </Card>
      </div>

      {/* Service Configuration */}
      <div className="mt-6">
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-xs mb-3">SERVICE CONFIGURATION</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-ods-text-secondary">Monthly Recurring Revenue</div>
              <div className="text-ods-text-primary">${'{'}organization?.mrrUsd?.toLocaleString() || '-'{'}'}</div>
            </div>
            <div>
              <div className="text-ods-text-secondary">Contract</div>
              <div className="text-ods-text-primary">{organization ? `${new Date(organization.contractStart).toLocaleDateString()} – ${new Date(organization.contractEnd).toLocaleDateString()}` : '-'}</div>
            </div>
            <div>
              <div className="text-ods-text-secondary">SLA Response Time</div>
              <div className="text-ods-text-primary"><StatusTag label={organization?.sla || '-'} variant={organization?.sla === 'Critical' ? 'critical' : organization?.sla === 'High' ? 'error' : organization?.sla === 'Medium' ? 'warning' : 'success'} /></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Notes */}
      <div className="mt-6">
        <Card className="bg-ods-card border border-ods-border p-4">
          <div className="text-ods-text-secondary text-xs mb-3">NOTES</div>
          <div className="flex flex-col gap-3">
            {(organization?.notes || []).map((n, i) => (
              <div key={i} className="text-ods-text-primary text-sm bg-ods-bg-hover rounded px-3 py-2 border border-ods-border">{n}</div>
            ))}
          </div>
        </Card>
      </div>
    </DetailPageContainer>
  )
}
