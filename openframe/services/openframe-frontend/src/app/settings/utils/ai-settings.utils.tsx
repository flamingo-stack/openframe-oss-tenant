import type { ReactNode } from 'react'
import type { ApprovalLevel, PermissionCategory } from '@flamingo-stack/openframe-frontend-core'
import { Shield } from 'lucide-react'
import { toUiKitToolType } from '@lib/tool-labels'
import type { PolicyRule } from '../types/ai-policies'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildPolicyGroups(rules: PolicyRule[]): Map<string, PermissionCategory[]> {
  const groupedByPolicyGroup = new Map<
    string,
    Map<
      string,
      {
        id: string
        name: string
        icon: ReactNode
        policies: PermissionCategory['policies']
      }
    >
  >()

  for (const rule of rules) {
    const policyGroupName = rule.policyGroup || 'General'
    const categoryName = rule.category || 'Other'
    const categoryId = slugify(`${policyGroupName}:${categoryName}`) || 'other'

    if (!groupedByPolicyGroup.has(policyGroupName)) {
      groupedByPolicyGroup.set(policyGroupName, new Map())
    }

    const policyGroupMap = groupedByPolicyGroup.get(policyGroupName)!

    if (!policyGroupMap.has(categoryId)) {
      policyGroupMap.set(categoryId, {
        id: categoryId,
        name: categoryName,
        icon: <Shield className="w-4 h-4" />,
        policies: [],
      })
    }

    policyGroupMap.get(categoryId)!.policies.push({
      id: rule.naturalKey,
      naturalKey: rule.naturalKey,
      name: rule.operation || rule.naturalKey,
      commandPattern: rule.commandPattern,
      toolName: toUiKitToolType(rule.tool),
      approvalLevel: rule.approvalLevel as ApprovalLevel,
    })
  }

  const finalGroups = new Map<string, PermissionCategory[]>()
  for (const [policyGroupName, categoriesMap] of groupedByPolicyGroup) {
    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        configurationsCount: c.policies.length,
        globalPermission: undefined,
        isExpanded: false,
        policies: c.policies,
      })) satisfies PermissionCategory[]

    finalGroups.set(policyGroupName, categories)
  }

  return finalGroups
}

export function clonePolicyGroups(groups: Map<string, PermissionCategory[]>) {
  return new Map(
    Array.from(groups.entries()).map(([groupName, categories]) => [
      groupName,
      categories.map(cat => ({
        ...cat,
        policies: cat.policies.map(p => ({ ...p })),
      })),
    ])
  )
}

export function mapToObject<T>(entries: Map<string, T>) {
  const obj: Record<string, T> = {}
  entries.forEach((value, key) => {
    obj[key] = value
  })
  return obj
}
