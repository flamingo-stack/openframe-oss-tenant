'use client'

import { CardLoader, DetailPageContainer, LoadError, MoreActionsMenu, NotFoundError } from '@flamingo-stack/openframe-frontend-core'
import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components/features'
import { Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ScriptEditor } from '../../../scripts/components/script-editor'
import { usePolicyDetails } from '../hooks/use-policy-details'

interface PolicyDetailsViewProps {
  policyId: string
}

export function PolicyDetailsView({ policyId }: PolicyDetailsViewProps) {
  const router = useRouter()
  const numericId = parseInt(policyId, 10)
  const isValidId = !isNaN(numericId)

  const { policyDetails, isLoading, error } = usePolicyDetails(isValidId ? numericId : null)

  const handleBack = () => {
    router.push('/monitoring?tab=policies')
  }

  const handleEditPolicy = () => {
    router.push(`/monitoring/policy/edit/${policyId}`)
  }

  if (isLoading) {
    return <CardLoader items={4} />
  }

  if (error) {
    return <LoadError message={`Error loading policy: ${error}`} />
  }

  if (!policyDetails) {
    return <NotFoundError message="Policy not found" />
  }

  return (
    <DetailPageContainer
      title={policyDetails.name}
      backButton={{
        label: 'Back to Policies',
        onClick: handleBack,
      }}
      headerActions={
        <MoreActionsMenu items={[
          {
            label: 'Edit Policy',
            icon: <Edit2 size={20} />,
            onClick: handleEditPolicy,
          },
        ]} />
      }
    >
      {/* Policy Info */}
      <div className="bg-ods-card border border-ods-border rounded-lg p-6">
        {policyDetails.description && (
          <div className="mb-6">
            <p className="text-ods-text-primary font-medium">{policyDetails.description}</p>
            <p className="text-ods-text-secondary text-sm mt-1">Description</p>
          </div>
        )}

        <div className="border-t border-ods-border pt-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            {policyDetails.platform ? (
              <OSTypeBadgeGroup osTypes={policyDetails.platform.split(',').map(p => p.trim()).filter(Boolean)} />
            ) : (
              <p className="text-ods-text-primary font-medium">All Platforms</p>
            )}
            <p className="text-ods-text-secondary text-xs mt-1">Platform</p>
          </div>

          <div>
            <span className={`px-2 py-1 rounded-md text-sm font-medium border ${
              policyDetails.critical
                ? 'border-[var(--ods-attention-red-error)] text-[var(--ods-attention-red-error)]'
                : 'border-ods-border text-ods-text-secondary'
            }`}>
              {policyDetails.critical ? 'Yes' : 'No'}
            </span>
            <p className="text-ods-text-secondary text-xs mt-1">Critical</p>
          </div>

          <div>
            <p className="text-[var(--ods-attention-green-success)] font-medium">{policyDetails.passing_host_count}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Passing Hosts</p>
          </div>

          <div>
            <p className="text-[var(--ods-attention-red-error)] font-medium">{policyDetails.failing_host_count}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Failing Hosts</p>
          </div>
        </div>

        {policyDetails.author_name && (
          <div className="border-t border-ods-border pt-4 mt-4">
            <p className="text-ods-text-primary font-medium">{policyDetails.author_name}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Author</p>
          </div>
        )}
      </div>

      {/* Query */}
      {policyDetails.query && (
        <div className="bg-ods-card border border-ods-border rounded-lg mt-6">
          <div className="p-4 border-b border-ods-border">
            <h3 className="text-ods-text-secondary text-xs font-semibold uppercase tracking-wider">QUERY</h3>
          </div>
          <ScriptEditor
            value={policyDetails.query}
            shell="sql"
            readOnly
            height="300px"
          />
        </div>
      )}
    </DetailPageContainer>
  )
}
