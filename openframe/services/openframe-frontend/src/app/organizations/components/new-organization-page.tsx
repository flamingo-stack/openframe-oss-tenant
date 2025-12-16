'use client'

import React, { useMemo, useState } from 'react'
import { DetailPageContainer, TabNavigation, type TabItem } from '@flamingo-stack/openframe-frontend-core'
import { Info as InfoIcon, UsersRound as UsersGroupIcon } from 'lucide-react'
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useRouter } from 'next/navigation'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { useCreateOrganization } from '../hooks/use-create-organization'
import { useOrganizationDetails } from '../hooks/use-organization-details'
import { useUpdateOrganization } from '../hooks/use-update-organization'
import { apiClient } from '@lib/api-client'

interface NewOrganizationPageProps {
  organizationId: string | null
}

import { GeneralInformationTab, type GeneralInfoState } from './tabs/general-information'
import { ContactInformationTab, type ContactInfoState } from './tabs/contact-information'

const DEFAULT_GENERAL: GeneralInfoState = {
  name: '',
  category: '',
  employees: '',
  serviceTier: 'Enterprise',
  sla: 'Critical',
  mrr: '',
  website: '',
  contractStart: '',
  contractEnd: '',
  notes: ''
}

export function NewOrganizationPage({ organizationId }: NewOrganizationPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { createOrganization } = useCreateOrganization()
  const { organization, fetchOrganizationById } = useOrganizationDetails()
  const { updateOrganization } = useUpdateOrganization()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [general, setGeneral] = useState<GeneralInfoState>(DEFAULT_GENERAL)
  const [contact, setContact] = useState<ContactInfoState>({
    primaryName: '', primaryTitle: '', primaryPhone: '', primaryEmail: '',
    billingName: '', billingTitle: '', billingPhone: '', billingEmail: '',
    technicalName: '', technicalTitle: '', technicalPhone: '', technicalEmail: '',
    physicalAddress: '', mailingAddress: '', mailingSameAsPhysical: true
  })

  const [didPrefill, setDidPrefill] = useState(false)
  React.useEffect(() => {
    if (organizationId && !didPrefill) {
      fetchOrganizationById(organizationId).catch(() => {})
    }
  }, [organizationId, didPrefill, fetchOrganizationById])

  React.useEffect(() => {
    if (organizationId && organization && !didPrefill) {
      setGeneral((prev) => ({
        ...prev,
        name: organization.name || '',
        category: organization.industry || '',
        employees: organization.employees != null ? String(organization.employees) : '',
        mrr: organization.mrrUsd != null ? String(organization.mrrUsd) : '',
        website: organization.website || '',
        contractStart: organization.contractStart ? new Date(organization.contractStart).toISOString().slice(0, 10) : '',
        contractEnd: organization.contractEnd ? new Date(organization.contractEnd).toISOString().slice(0, 10) : '',
        notes: (organization.notes || []).join('\n'),
        imageUrl: organization.imageUrl || undefined
      }))

      setContact((prev) => ({
        ...prev,
        primaryName: organization.primary.name || '',
        primaryTitle: organization.primary.title || '',
        primaryPhone: organization.primary.phone || '',
        primaryEmail: organization.primary.email || '',
        billingName: organization.billing.name || '',
        billingTitle: organization.billing.title || '',
        billingPhone: organization.billing.phone || '',
        billingEmail: organization.billing.email || '',
        technicalName: organization.technical.name || '',
        technicalTitle: organization.technical.title || '',
        technicalPhone: organization.technical.phone || '',
        technicalEmail: organization.technical.email || '',
        physicalAddress: organization.physicalAddress || '',
        mailingAddress: organization.mailingAddress || '',
        mailingSameAsPhysical: prev.mailingSameAsPhysical
      }))

      setDidPrefill(true)
    }
  }, [organizationId, organization, didPrefill])

  const tabs = useMemo<TabItem[]>(() => [
    { id: 'general', label: 'General Information', icon: InfoIcon as TabItem['icon'] },
    { id: 'contact', label: 'Contact Information', icon: UsersGroupIcon as TabItem['icon'] },
  ], [])

  const saveDisabled = !general.name.trim() || isSubmitting

  const toNumberOrNull = (value: string): number | null => {
    const cleaned = (value || '').toString().replace(/,/g, '').trim()
    if (cleaned === '') return null
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : null
  }

  const buildContacts = () => {
    const contacts = [] as Array<{ contactName: string; title: string; phone: string; email: string }>
    if (contact.primaryName || contact.primaryTitle || contact.primaryPhone || contact.primaryEmail) {
      contacts.push({ contactName: contact.primaryName, title: contact.primaryTitle, phone: contact.primaryPhone, email: contact.primaryEmail })
    }
    if (contact.billingName || contact.billingTitle || contact.billingPhone || contact.billingEmail) {
      contacts.push({ contactName: contact.billingName, title: contact.billingTitle, phone: contact.billingPhone, email: contact.billingEmail })
    }
    if (contact.technicalName || contact.technicalTitle || contact.technicalPhone || contact.technicalEmail) {
      contacts.push({ contactName: contact.technicalName, title: contact.technicalTitle, phone: contact.technicalPhone, email: contact.technicalEmail })
    }
    return contacts
  }

  const buildAddressDto = (raw: string) => ({
    street1: raw || '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  })

  const handleSave = async () => {
    try {
      setIsSubmitting(true)

      const payload = {
        name: general.name.trim(),
        category: general.category || undefined,
        numberOfEmployees: toNumberOrNull(general.employees),
        websiteUrl: general.website || undefined,
        notes: general.notes || undefined,
        contactInformation: {
          contacts: buildContacts(),
          physicalAddress: buildAddressDto(contact.physicalAddress),
          mailingAddress: buildAddressDto(contact.mailingAddress),
          mailingAddressSameAsPhysical: Boolean(contact.mailingSameAsPhysical)
        },
        monthlyRevenue: toNumberOrNull(general.mrr),
        contractStartDate: general.contractStart || undefined,
        contractEndDate: general.contractEnd || undefined
      }

      let createdOrganizationId: string | null = null

      if (organizationId) {
        await updateOrganization(organizationId, payload)
      } else {
        const response = await createOrganization(payload)
        createdOrganizationId = response?.organizationId || response?.id || null
      }

      if (!organizationId && createdOrganizationId && general.logoUrl && general.logoUrl.startsWith('data:')) {
        try {
          const response = await fetch(general.logoUrl)
          const blob = await response.blob()
          
          const formData = new FormData()
          formData.append('file', blob, 'logo.png')
          
          const uploadResponse = await apiClient.request(`/organizations/${createdOrganizationId}/image`, {
            method: 'POST',
            body: formData
          })

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload logo')
          }
        } catch (imageError) {
          toast({ 
            title: 'Warning', 
            description: 'Organization was created but logo upload failed', 
            variant: 'warning' 
          })
        }
      }

      toast({ title: organizationId ? 'Organization updated' : 'Organization created', description: `${general.name} has been ${organizationId ? 'updated' : 'created'}` })
      router.push('/organizations')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create organization'
      toast({ title: 'Create failed', description: msg, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DetailPageContainer
      title={organizationId ? 'Edit Organization' : 'New Organization'}
      backButton={{ label: 'Back to Organizations', onClick: () => router.push('/organizations') }}
      padding='none'
      className='pt-6'
      headerActions={(
        <Button
          variant="primary"
          disabled={saveDisabled}
          onClick={handleSave}
          className="bg-ods-accent text-ods-text-on-accent font-['DM_Sans'] font-bold text-[16px] px-4 py-2.5 h-12"
        >
          {isSubmitting ? 'Saving...' : 'Save Organization'}
        </Button>
      )}
    >
      <div className="flex flex-col w-full">
        <TabNavigation tabs={tabs} defaultTab="general" urlSync={true}>
          {(activeTab) => (
            <>
              {activeTab === 'general' && (
                <GeneralInformationTab 
                  value={general} 
                  onChange={setGeneral} 
                  organizationId={organization?.organizationId || undefined}
                />
              )}

              {activeTab === 'contact' && (
                <ContactInformationTab value={contact} onChange={setContact} />
              )}
            </>
          )}
        </TabNavigation>
      </div>
    </DetailPageContainer>
  )
}


