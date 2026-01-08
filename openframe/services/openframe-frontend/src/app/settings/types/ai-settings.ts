import type { ApprovalLevel, PermissionCategory } from '@flamingo-stack/openframe-frontend-core'
import type { PolicyTemplateDetail } from './ai-policies'

export type CustomPolicyState = {
  enabled: boolean
  baseTemplateId: string | null
  originalRules: Map<string, ApprovalLevel>
  changes: Map<string, ApprovalLevel>
  existingOverrides: Record<string, ApprovalLevel>
  baseTemplateForDisplay: PolicyTemplateDetail | null
}

export type EditSnapshot = {
  provider: string
  model: string
  templateId: string | null
  policyGroups: Map<string, PermissionCategory[]>
  customBaseTemplateId: string | null
}


