'use client';

import {
  type ActionsMenuGroup,
  CardLoader,
  LoadError,
  NotFoundError,
  type PageActionButton,
  PageLayout,
  type PanelRow,
  StackedRowsPanel,
  Tag,
} from '@flamingo-stack/openframe-frontend-core';
import { PenEditIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { CONTEXT_ENTITY_KIND } from '../../../mingo/context/context-types';
import { useTrackOpenView } from '../../../mingo/context/use-track-open-view';
import { ScriptEditor } from '../../../scripts/components/script/script-editor';
import { ConfirmDeleteMonitoringModal } from '../../components/confirm-delete-monitoring-modal';
import { usePolicies } from '../../hooks/use-policies';
import type { Policy } from '../../types/policies.types';
import { getPolicyStatus, POLICY_STATUS_CONFIG } from '../../utils/compute-policy-summary';
import { usePolicyDetails } from '../hooks/use-policy-details';
import { PolicyDevicesTable } from './policy-devices-table';

function PolicyStatusTag({ policy }: { policy: Policy }) {
  const config = POLICY_STATUS_CONFIG[getPolicyStatus(policy)];
  return <Tag label={config.label} variant={config.variant} />;
}

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

  // Register this policy as the Mingo "open view" (passive context) so the agent
  // gets the user's working context on the next message; cleared → recent views.
  useTrackOpenView(
    policyDetails ? { type: CONTEXT_ENTITY_KIND.POLICY, id: policyId, label: policyDetails.name } : null,
  );

  const handleBack = useSafeBack('/monitoring?tab=policies');

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

  const actions: PageActionButton[] = [
    {
      label: 'Edit',
      icon: <PenEditIcon size={24} className="text-ods-text-secondary" />,
      variant: 'outline',
      onClick: handleEditPolicy,
    },
  ];

  const menuActions: ActionsMenuGroup[] = [
    {
      items: [
        {
          id: 'delete-policy',
          label: 'Delete Policy',
          icon: <TrashIcon />,
          onClick: () => setIsDeleteModalOpen(true),
          disabled: isDeleting,
        },
      ],
    },
  ];

  const policyInfoRows: PanelRow[] = [
    ...(policyDetails.description
      ? [
          {
            id: 'description',
            columns: [{ key: 'description', value: policyDetails.description, label: 'Description' }],
          },
        ]
      : []),
    {
      id: 'meta',
      columns: [
        { key: 'severity', value: policyDetails.critical ? 'Critical' : 'Low', label: 'Severity' },
        { key: 'status', value: <PolicyStatusTag policy={policyDetails} />, label: 'Status' },
        { key: 'author', value: policyDetails.author_name, label: 'Author' },
      ],
    },
  ];

  return (
    <PageLayout
      title={policyDetails.name}
      backButton={{
        label: 'Back',
        onClick: handleBack,
      }}
      actions={actions}
      menuActions={menuActions}
      actionsVariant="menu-primary"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      {/* Policy Info */}
      <StackedRowsPanel rows={policyInfoRows} />

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
          <PolicyDevicesTable policyId={numericId} assignedHostIds={policyDetails.hosts_include_any} />
        </div>
      </div>
      <ConfirmDeleteMonitoringModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        itemName={policyDetails.name}
        itemType="policy"
        onConfirm={handleDeletePolicy}
      />
    </PageLayout>
  );
}
