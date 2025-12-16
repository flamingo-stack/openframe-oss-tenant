'use client'

import { useCallback, useState } from 'react'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { GET_ORGANIZATION_BY_ID_QUERY } from '../queries/organizations-queries'

export interface OrganizationDetails {
  id: string
  organizationId: string
  name: string
  industry: string
  website: string
  employees: number | null
  updatedAt: string
  physicalAddress: string
  mailingAddress: string
  primary: { name: string; title: string; email: string; phone: string }
  billing: { name: string; title: string; email: string; phone: string }
  technical: { name: string; title: string; email: string; phone: string }
  mrrUsd: number | null
  contractStart: string | null
  contractEnd: string | null
  notes: string[]
  isDefault: boolean
  imageUrl?: string | null
}

function formatAddress(addr?: any): string {
  if (!addr) return ''
  const parts = [addr.street1, addr.street2, addr.city, addr.state, addr.postalCode, addr.country]
  return parts.filter(Boolean).join(', ')
}

export function useOrganizationDetails() {
  const { toast } = useToast()
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizationById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post<any>('/api/graphql', {
        query: GET_ORGANIZATION_BY_ID_QUERY,
        variables: { id }
      })

      if (!response.ok) {
        throw new Error(response.error || `Request failed with status ${response.status}`)
      }

      const org = (response.data as any)?.data?.organization
      if (!org) {
        setOrganization(null)
        return null
      }

      const contacts = Array.isArray(org.contactInformation?.contacts) ? org.contactInformation.contacts : []
      const primary = contacts[0] || {}
      const billing = contacts[1] || {}
      const technical = contacts[2] || {}

      const mapped: OrganizationDetails = {
        id: org.id,
        organizationId: org.organizationId,
        name: org.name || '-',
        industry: org.category || '-',
        website: org.websiteUrl || '-',
        employees: typeof org.numberOfEmployees === 'number' ? org.numberOfEmployees : null,
        updatedAt: org.updatedAt || org.createdAt || new Date().toISOString(),
        physicalAddress: formatAddress(org.contactInformation?.physicalAddress),
        mailingAddress: formatAddress(org.contactInformation?.mailingAddress),
        primary: { name: primary.contactName || '', title: primary.title || '', email: primary.email || '', phone: primary.phone || '' },
        billing: { name: billing.contactName || '', title: billing.title || '', email: billing.email || '', phone: billing.phone || '' },
        technical: { name: technical.contactName || '', title: technical.title || '', email: technical.email || '', phone: technical.phone || '' },
        mrrUsd: typeof org.monthlyRevenue === 'number' ? org.monthlyRevenue : null,
        contractStart: org.contractStartDate || null,
        contractEnd: org.contractEndDate || null,
        notes: (org.notes ? [org.notes] : []),
        isDefault: org.isDefault || false,
        imageUrl: org.image?.imageUrl
      }

      setOrganization(mapped)
      return mapped
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load organization'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
      throw e
    } finally {
      setLoading(false)
    }
  }, [toast])

  return { organization, isLoading, error, fetchOrganizationById }
}


