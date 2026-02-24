'use client'

import { CardLoader, DetailPageContainer, LoadError, MoreActionsMenu, NotFoundError, QueryReportTable } from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ScriptEditor } from '../../../scripts/components/script-editor'
import { useQueryDetails } from '../hooks/use-query-details'
import { useQueryReport } from '../hooks/use-query-report'

function formatInterval(seconds: number): string {
  if (seconds === 0) return 'Manual'
  if (seconds < 60) return `Every ${seconds}s`
  if (seconds < 3600) return `Every ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)}h`
  return `Every ${Math.floor(seconds / 86400)}d`
}

interface QueryDetailsViewProps {
  queryId: string
}

export function QueryDetailsView({ queryId }: QueryDetailsViewProps) {
  const router = useRouter()
  const numericId = parseInt(queryId, 10)
  const isValidId = !isNaN(numericId)

  const { toast } = useToast()
  const { queryDetails, isLoading, error } = useQueryDetails(isValidId ? numericId : null)
  const { rows, isLoading: isReportLoading } = useQueryReport(isValidId ? numericId : null)

  const handleBack = () => {
    router.push('/monitoring?tab=queries')
  }

  const handleEditQuery = () => {
    router.push(`/monitoring/query/edit/${queryId}`)
  }

  if (isLoading) {
    return <CardLoader items={4} />
  }

  if (error) {
    return <LoadError message={`Error loading query: ${error}`} />
  }

  if (!queryDetails) {
    return <NotFoundError message="Query not found" />
  }

  return (
    <DetailPageContainer
      title={queryDetails.name}
      backButton={{
        label: 'Back to Queries',
        onClick: handleBack,
      }}
      headerActions={
        <MoreActionsMenu items={[
          {
            label: 'Edit Query',
            icon: <Edit2 size={20} />,
            onClick: handleEditQuery,
          },
        ]} />
      }
    >
      {/* Query Info */}
      <div className="bg-ods-card border border-ods-border rounded-lg p-6">
        {queryDetails.description && (
          <div className="mb-6">
            <p className="text-ods-text-primary font-medium">{queryDetails.description}</p>
            <p className="text-ods-text-secondary text-sm mt-1">Description</p>
          </div>
        )}

        <div className="border-t border-ods-border pt-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-ods-text-primary font-medium">{formatInterval(queryDetails.interval)}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Frequency</p>
          </div>
        </div>
      </div>

      {/* Query */}
      {queryDetails.query && (
        <div className="bg-ods-card border border-ods-border rounded-lg mt-6">
          <div className="p-4 border-b border-ods-border">
            <h3 className="text-ods-text-secondary text-xs font-semibold uppercase tracking-wider">QUERY</h3>
          </div>
          <ScriptEditor
            value={queryDetails.query}
            shell="sql"
            readOnly
            height="300px"
          />
        </div>
      )}

      {/* Report */}
      <div className="mt-6">
        <QueryReportTable
          title="Query Results"
          data={rows}
          loading={isReportLoading}
          emptyMessage="No report results available"
          columnOrder={['host_name', 'last_fetched']}
          exportFilename={`query-${queryDetails.name}-report`}
          onExport={() => {
            toast({ title: 'Report Exported', description: 'Query report exported as CSV', variant: 'success' })
          }}
        />
      </div>
    </DetailPageContainer>
  )
}
