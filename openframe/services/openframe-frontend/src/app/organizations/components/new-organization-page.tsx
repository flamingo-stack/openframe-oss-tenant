'use client'

import React, { useMemo, useState } from 'react'
import { DetailPageContainer, TabNavigation, type TabItem } from '@flamingo/ui-kit'
import { Info as InfoIcon, UsersRound as UsersGroupIcon, Shield as ShieldLockIcon, Clock as ClockIcon } from 'lucide-react'
import { Button } from '@flamingo/ui-kit/components/ui'
import { useRouter } from 'next/navigation'

interface NewOrganizationPageProps {
  organizationId: string | null
}

import { GeneralInformationTab, type GeneralInfoState } from './tabs/general-information'
import { ContactInformationTab, type ContactInfoState } from './tabs/contact-information'

type TabId = 'general' | 'contact' | 'security' | 'business-hours'

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
  const [activeTab, setActiveTab] = useState<TabId>('general')

  // Local state lives for lifetime of this page instance; switching tabs preserves values
  const [general, setGeneral] = useState<GeneralInfoState>(DEFAULT_GENERAL)
  const [contact, setContact] = useState<ContactInfoState>({
    primaryName: '', primaryTitle: '', primaryPhone: '', primaryEmail: '',
    billingName: '', billingTitle: '', billingPhone: '', billingEmail: '',
    technicalName: '', technicalTitle: '', technicalPhone: '', technicalEmail: '',
    physicalAddress: '', mailingAddress: '', mailingSameAsPhysical: true
  })

  const tabs = useMemo<TabItem[]>(() => [
    { id: 'general', label: 'General Information', icon: InfoIcon },
    { id: 'contact', label: 'Contact Information', icon: UsersGroupIcon },
    { id: 'security', label: 'Security and Network', icon: ShieldLockIcon },
    { id: 'business-hours', label: 'Business Hours', icon: ClockIcon }
  ], [])

  const saveDisabled = !general.name.trim()

  const handleSave = () => {
    // For now just go back; integration will post to API later
    router.push('/organizations')
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
          Save Organization
        </Button>
      )}
    >
      <div className="flex flex-col w-full">
        <TabNavigation activeTab={activeTab} onTabChange={(t) => setActiveTab(t as TabId)} tabs={tabs} />

        {/* General Information Tab */}
        {activeTab === 'general' && (
          <GeneralInformationTab value={general} onChange={setGeneral} />
        )}

        {/* Placeholder content for other tabs (state should persist when switching) */}
        {activeTab === 'contact' && (
          <ContactInformationTab value={contact} onChange={setContact} />
        )}
        {activeTab !== 'general' && activeTab !== 'contact' && (
          <div className="p-6 text-ods-text-secondary">This section will be implemented later.</div>
        )}
      </div>
    </DetailPageContainer>
  )
}


