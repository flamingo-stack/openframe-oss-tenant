'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { ArrowRightUpIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ColumnDef,
  DataTable,
  MoreActionsMenu,
  PageLayout,
  type Row,
  SquareAvatar,
  Tag,
  TruncateText,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { employeeDetailHref } from '@/app/(app)/settings/employees/routes';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { getFullImageUrl } from '@/lib/image-url';
import { openInNewTab } from '@/lib/open-in-new-tab';
import { routes } from '@/lib/routes';
import { InvitationStatus } from '../../hooks/use-invitations';
import { UserStatus } from '../../hooks/use-users';
import {
  RecordType,
  type UnifiedUserRecord,
  type UnifiedUserStatus,
  useUsersAndInvitations,
} from '../../hooks/use-users-and-invitations';
import { AddUsersModal } from '../add-users-modal';
import { ConfirmRemoveInvitationModal } from '../confirm-remove-invitation-modal';
import { ConfirmResendInvitationModal } from '../confirm-resend-invitation-modal';
import { ConfirmRevokeInvitationModal } from '../confirm-revoke-invitation-modal';

const statusToLabel = {
  [UserStatus.Active]: 'ACTIVE',
  [UserStatus.Deleted]: 'DELETED',
  [InvitationStatus.Pending]: 'INVITE SENT',
  [InvitationStatus.Expired]: 'INVITE EXPIRED',
} as const satisfies Record<UnifiedUserStatus, string>;

const statusToVariant = {
  [UserStatus.Active]: 'success',
  [UserStatus.Deleted]: 'grey',
  [InvitationStatus.Pending]: 'warning',
  [InvitationStatus.Expired]: 'error',
} as const satisfies Record<UnifiedUserStatus, 'success' | 'grey' | 'warning' | 'error'>;

const employeeRowHref = (record: UnifiedUserRecord) =>
  record.type === RecordType.User ? employeeDetailHref(record.id) : null;

export function CompanyAndUsersTab() {
  const handleBack = useSafeBack(routes.settings.root());
  const {
    records,
    isLoading,
    error,
    revokeInvitation,
    revokeInvitationMutation,
    resendInvitation,
    resendInvitationMutation,
    inviteUsers,
    // get all users and invitations without pagination TODO: add pagination in the future
  } = useUsersAndInvitations(0, 1000);

  const [isAddOpen, setIsAddOpen] = useState(false);

  const [selectedInvitation, setSelectedInvitation] = useState<UnifiedUserRecord | null>(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isResendOpen, setIsResendOpen] = useState(false);

  const handleRevokeRequest = useCallback((record: UnifiedUserRecord) => {
    if (record.type !== RecordType.Invitation) {
      return;
    }
    setSelectedInvitation(record);
    setIsRevokeOpen(true);
  }, []);

  const handleConfirmRevoke = useCallback(async () => {
    if (!selectedInvitation || selectedInvitation.type !== RecordType.Invitation) return;
    revokeInvitation(selectedInvitation.id, {
      onSuccess: () => {
        setIsRevokeOpen(false);
        setSelectedInvitation(null);
      },
    });
  }, [selectedInvitation, revokeInvitation]);

  const handleRemoveRequest = useCallback((record: UnifiedUserRecord) => {
    if (record.type !== RecordType.Invitation) return;
    setSelectedInvitation(record);
    setIsRemoveOpen(true);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!selectedInvitation || selectedInvitation.type !== RecordType.Invitation) return;
    revokeInvitation(selectedInvitation.id, {
      onSuccess: () => {
        setIsRemoveOpen(false);
        setSelectedInvitation(null);
      },
    });
  }, [selectedInvitation, revokeInvitation]);

  const handleResendRequest = useCallback((record: UnifiedUserRecord) => {
    if (record.type !== RecordType.Invitation) return;
    setSelectedInvitation(record);
    setIsResendOpen(true);
  }, []);

  const handleConfirmResend = useCallback(async () => {
    if (!selectedInvitation || selectedInvitation.type !== RecordType.Invitation) return;
    resendInvitation(selectedInvitation.id, {
      onSuccess: () => {
        setIsResendOpen(false);
        setSelectedInvitation(null);
      },
    });
  }, [selectedInvitation, resendInvitation]);

  const handleInviteUsers = async (rows: { email: string }[]) => {
    await inviteUsers(rows.map(r => r.email));
  };

  const columns = useMemo<ColumnDef<UnifiedUserRecord>[]>(
    () => [
      {
        accessorKey: 'user',
        header: 'USER',
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => {
          const displayName =
            row.original.firstName || row.original.lastName
              ? `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim()
              : row.original.email;

          return (
            <div className="flex items-center gap-[var(--spacing-system-xs)] min-w-0">
              <SquareAvatar
                src={getFullImageUrl(row.original.image?.imageUrl, row.original.image?.hash)}
                fallback={displayName}
                size="sm"
                variant="round"
              />
              <div className="flex flex-col min-w-0">
                <TruncateText>{displayName}</TruncateText>
                <TruncateText variant="h6" tone="secondary" mono>
                  {row.original.email}
                </TruncateText>
              </div>
            </div>
          );
        },
        meta: { width: 'w-1/3 max-md:flex-[3] max-md:min-w-0' },
      },
      {
        accessorKey: 'roles',
        header: 'ROLE',
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => (
          <TruncateText>{(row.original.roles || []).join(', ') || '—'}</TruncateText>
        ),
        meta: { width: 'w-1/3 max-md:flex-[2] max-md:min-w-0' },
      },
      {
        accessorKey: 'status',
        header: 'STATUS',
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => {
          const statusLabel = row.original.status;
          const variant = statusToVariant[statusLabel as keyof typeof statusToVariant];
          const label = statusToLabel[statusLabel as keyof typeof statusToLabel];

          return (
            <div className="">
              <Tag label={label} variant={variant} />
            </div>
          );
        },
        meta: { width: 'w-1/3', hideAt: 'md' },
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => {
          const record = row.original;
          if (record.type === RecordType.Invitation) {
            const isExpired = record.status === InvitationStatus.Expired;

            if (isExpired) {
              return (
                <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
                  <MoreActionsMenu
                    className="px-4"
                    items={[
                      {
                        label: 'Resend',
                        onClick: () => handleResendRequest(record),
                      },
                      {
                        label: 'Remove',
                        onClick: () => handleRemoveRequest(record),
                        danger: true,
                      },
                    ]}
                  />
                </div>
              );
            }

            return (
              <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
                <MoreActionsMenu
                  className="px-4"
                  items={[
                    {
                      label: 'Revoke',
                      onClick: () => handleRevokeRequest(record),
                      danger: true,
                    },
                  ]}
                />
              </div>
            );
          }

          return null;
        },
        enableSorting: false,
        meta: { width: 'min-w-[100px] w-auto shrink-0 flex-none', align: 'right', hideAt: 'md' },
      },
      {
        id: 'open',
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => {
          if (row.original.type !== RecordType.User) {
            return null;
          }
          return (
            <div data-no-row-click className="flex items-center justify-end pointer-events-auto">
              <Button
                onClick={openInNewTab(employeeDetailHref(row.original.id))}
                variant="outline"
                size="icon"
                leftIcon={<ArrowRightUpIcon className="w-5 h-5" />}
                aria-label="Open in new tab"
                className="bg-ods-card"
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'w-12 shrink-0 flex-none', hideAt: 'md', align: 'right' },
      },
    ],
    [handleRevokeRequest, handleRemoveRequest, handleResendRequest],
  );

  const table = useDataTable<UnifiedUserRecord>({
    data: records,
    columns,
    getRowId: (row: UnifiedUserRecord) => row.id,
    enableSorting: false,
  });

  const actions = [
    {
      label: 'Add Users',
      icon: <PlusCircleIcon iconSize={20} whiteOverlay />,
      onClick: () => setIsAddOpen(true),
      variant: 'outline' as const,
    },
  ];

  const isMutating = revokeInvitationMutation.isPending || resendInvitationMutation.isPending;

  return (
    <PageLayout
      title="Openframe"
      actions={actions}
      actionsVariant="icon-buttons"
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body
          loading={isLoading || isMutating}
          emptyMessage={error || 'No users or invitations found.'}
          rowHref={employeeRowHref}
        />
      </DataTable>
      <ConfirmRevokeInvitationModal
        open={isRevokeOpen}
        onOpenChange={setIsRevokeOpen}
        userEmail={selectedInvitation?.email || ''}
        onConfirm={handleConfirmRevoke}
      />
      <ConfirmRemoveInvitationModal
        open={isRemoveOpen}
        onOpenChange={setIsRemoveOpen}
        userEmail={selectedInvitation?.email || ''}
        onConfirm={handleConfirmRemove}
      />
      <ConfirmResendInvitationModal
        open={isResendOpen}
        onOpenChange={setIsResendOpen}
        userEmail={selectedInvitation?.email || ''}
        onConfirm={handleConfirmResend}
      />
      <AddUsersModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} invite={handleInviteUsers} />
    </PageLayout>
  );
}
