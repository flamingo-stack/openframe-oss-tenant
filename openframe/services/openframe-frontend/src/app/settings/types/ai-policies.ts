import type { ApprovalLevel } from '@flamingo-stack/openframe-frontend-core'

export const CUSTOM_CREATION_TEMPLATE_ID = 'CUSTOM_CREATION' as const

export interface PolicyTemplateSummary {
  id: string
  displayName: string
  description?: string
  type: 'TEMPLATE' | 'CUSTOM' | string
  isActive: boolean
  customOverridesCount: number
}

export interface PolicyRule {
  tool: string
  function: string
  policyGroup: string
  category: string
  operation: string
  commandPattern: string
  approvalLevel: ApprovalLevel
  naturalKey: string
}

export interface PolicyTemplateDetail {
  id: string
  displayName: string
  type: 'TEMPLATE' | 'CUSTOM' | string
  sourceTemplate?: string
  rules: PolicyRule[]
  customOverrides: Record<string, unknown>
  active: boolean
}

export interface CustomPolicyRequest {
  templateId: string
  overrides: Record<string, ApprovalLevel>
}
