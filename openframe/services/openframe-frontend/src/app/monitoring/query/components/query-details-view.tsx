'use client';

import {
  Button,
  CardLoader,
  DetailPageContainer,
  LoadError,
  MoreActionsMenu,
  NotFoundError,
  QueryReportTable,
} from '@flamingo-stack/openframe-frontend-core';
import { PenEditIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { useQueries } from '../../hooks/use-queries';
import { useQueryDetails } from '../hooks/use-query-details';
import { useQueryReport } from '../hooks/use-query-report';

function formatInterval(seconds: number): string {
  if (seconds === 0) return 'Manual';
  if (seconds < 60) return `Every ${seconds}s`;
  if (seconds < 3600) return `Every ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `Every ${Math.floor(seconds / 3600)}h`;
  return `Every ${Math.floor(seconds / 86400)}d`;
}

interface QueryDetailsViewProps {
  queryId: string;
}

export function QueryDetailsView({ queryId }: QueryDetailsViewProps) {
  const router = useRouter();
  const numericId = parseInt(queryId, 10);
  const isValidId = !isNaN(numericId);

  const { toast } = useToast();
  const { queryDetails, isLoading, error } = useQueryDetails(isValidId ? numericId : null);
  const { rows, isLoading: isReportLoading } = useQueryReport(isValidId ? numericId : null);
  const { deleteQuery, isDeleting } = useQueries();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleBack = () => {
    router.push('/monitoring?tab=queries');
  };

  const handleEditQuery = () => {
    router.push(`/monitoring/query/edit/${queryId}`);
  };

  const handleDeleteQuery = () => {
    deleteQuery(numericId, {
      onSuccess: () => router.push('/monitoring?tab=queries'),
    });
  };

  if (isLoading) {
    return <CardLoader items={4} />;
  }

  if (error) {
    return <LoadError message={`Error loading query: ${error}`} />;
  }

  if (!queryDetails) {
    return <NotFoundError message="Query not found" />;
  }

  return (
    <DetailPageContainer
      title={queryDetails.name}
      backButton={{
        label: 'Back to Queries',
        onClick: handleBack,
      }}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            leftIcon={<PenEditIcon size={24} className="text-ods-text-secondary" />}
            variant="card"
            onClick={handleEditQuery}
          >
            Edit
          </Button>
          <MoreActionsMenu
            items={[
              {
                label: 'Delete Query',
                icon: <TrashIcon />,
                onClick: () => setIsDeleteModalOpen(true),
                disabled: isDeleting,
              },
            ]}
          />
        </div>
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
        <div className="mt-6">
          <div className="">
            <h3 className="font-mono text-ods-text-secondary text-xs font-semibold uppercase tracking-wider">QUERY</h3>
          </div>
          <ScriptEditor value={queryDetails.query} shell="sql" readOnly height="300px" />
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
            toast({ title: 'Report Exported', description: 'Query report exported as CSV', variant: 'success' });
          }}
        />
      </div>
      <ConfirmDeleteMonitoringModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={queryDetails.name}
        itemType="query"
        onConfirm={handleDeleteQuery}
      />
    </DetailPageContainer>
  );
}
