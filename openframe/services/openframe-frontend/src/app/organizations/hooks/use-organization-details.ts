'use client'

import { useCallback, useState } from 'react'
import { useToast } from '@flamingo/ui-kit/hooks'

export interface OrganizationDetails {
  id: string
  name: string
  tier: 'Basic' | 'Premium' | 'Enterprise'
  industry: string
  website: string
  employees: number
  updatedAt: string
  physicalAddress: string
  mailingAddress: string
  primary: { name: string; title: string; email: string; phone: string }
  billing: { name: string; title: string; email: string; phone: string }
  technical: { name: string; title: string; email: string; phone: string }
  mrrUsd: number
  contractStart: string
  contractEnd: string
  sla: 'Low' | 'Medium' | 'High' | 'Critical'
  notes: string[]
}

const MOCK_ORG: OrganizationDetails = {
  id: '1',
  name: 'TechFlow Solutions',
  tier: 'Enterprise',
  industry: 'Software Development',
  website: 'techflow.com',
  employees: 85,
  updatedAt: '2025-07-22T14:17:05Z',
  physicalAddress: '1250 Tech Boulevard, Suite 400, Austin, TX 78701, USA',
  mailingAddress: '1250 Tech Boulevard, Suite 400, Austin, TX 78701, USA',
  primary: { name: 'Mike Johnson', title: 'CTO', email: 'mike.johnson@techflow.com', phone: '+1 (555) 234-5678' },
  billing: { name: 'Rachel Smith', title: 'Finance Director', email: 'rachel.smith@techflow.com', phone: '+1 (555) 234-5680' },
  technical: { name: 'Kevin Park', title: 'IT Manager', email: 'kevin.park@techflow.com', phone: '+1 (555) 234-5682' },
  mrrUsd: 4250,
  contractStart: '2022-03-15',
  contractEnd: '2025-03-15',
  sla: 'Critical',
  notes: [
    'Started immediate cleanup. Cleared 8GB from temp files and IIS logs... (2025/08/27 14:45)',
    'Found 12GB of old .pst files... (2025/08/27 15:20)'
  ]
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
      // TODO: replace with real API
      const result = { ...MOCK_ORG, id }
      setOrganization(result)
      return result
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


