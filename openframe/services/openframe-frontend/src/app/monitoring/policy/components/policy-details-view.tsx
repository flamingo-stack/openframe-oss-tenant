'use client';

import {
  Button,
  CardLoader,
  DetailPageContainer,
  LoadError,
  MoreActionsMenu,
  NotFoundError,
} from '@flamingo-stack/openframe-frontend-core';
import { PenEditIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { usePolicies } from '../../hooks/use-policies';
import { usePolicyDetails } from '../hooks/use-policy-details';
import { PolicyDevicesTable } from './policy-devices-table';

interface PolicyDetailsViewProps {
  policyId: string;
}

export function PolicyDetailsView({ policyId }: PolicyDetailsViewProps) {
  const router = useRouter();
  const numericId = parseInt(policyId, 10);
  const isValidId = !isNaN(numericId);

  const { policyDetails, isLoading, error } = usePolicyDetails(isValidId ? numericId : null);
  const { deletePolicy, isDeleting } = usePolicies();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleBack = () => {
    router.push('/monitoring?tab=policies');
  };

  const handleEditPolicy = () => {
    router.push(`/monitoring/policy/edit/${policyId}`);
  };

  const handleDeletePolicy = () => {
    deletePolicy(numericId, {
      onSuccess: () => router.push('/monitoring?tab=policies'),
    });
  };

  if (isLoading) {
    return <CardLoader items={4} />;
  }

  if (error) {
    return <LoadError message={`Error loading policy: ${error}`} />;
  }

  if (!policyDetails) {
    return <NotFoundError message="Policy not found" />;
  }

  return (
    <DetailPageContainer
      title={policyDetails.name}
      backButton={{
        label: 'Back to Policies',
        onClick: handleBack,
      }}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            leftIcon={<PenEditIcon size={24} className="text-ods-text-secondary" />}
            variant="card"
            onClick={handleEditPolicy}
          >
            Edit
          </Button>
          <MoreActionsMenu
            items={[
              {
                label: 'Delete Policy',
                icon: <TrashIcon />,
                onClick: () => setIsDeleteModalOpen(true),
                disabled: isDeleting,
              },
            ]}
          />
        </div>
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
            <span
              className={`px-2 py-1 rounded-md text-sm font-medium border ${
                policyDetails.critical
                  ? 'border-[var(--ods-attention-red-error)] text-[var(--ods-attention-red-error)]'
                  : 'border-ods-border text-ods-text-secondary'
              }`}
            >
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

          <div>
            <p className="text-ods-text-primary font-medium">{policyDetails.author_name}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Author</p>
          </div>
        </div>
      </div>

      {/* Query */}
      {policyDetails.query && (
        <div className="mt-6">
          <div className="">
            <h3 className="font-mono text-ods-text-secondary text-xs font-semibold uppercase tracking-wider">QUERY</h3>
          </div>
          <ScriptEditor value={policyDetails.query} shell="sql" readOnly height="300px" />
        </div>
      )}

      {/* Policy Devices */}
      <div className="mt-6">
        <h1 className="text-h2 tracking-[-0.64px] text-ods-text-primary pt-6">Devices</h1>
        <div className="pt-4">
          <PolicyDevicesTable policyId={numericId} />
        </div>
      </div>
      <ConfirmDeleteMonitoringModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={policyDetails.name}
        itemType="policy"
        onConfirm={handleDeletePolicy}
      />
    </DetailPageContainer>
  );
}
