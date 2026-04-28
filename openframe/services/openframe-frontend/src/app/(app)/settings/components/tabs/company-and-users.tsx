'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  type ColumnDef,
  DataTable,
  ListPageContainer,
  MoreActionsMenu,
  type Row,
  Tag,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useAuthStore } from '@/app/(auth)/auth/stores/auth-store';
import { InvitationStatus } from '../../hooks/use-invitations';
import { UserStatus } from '../../hooks/use-users';
import {
  RecordType,
  type UnifiedUserRecord,
  type UnifiedUserStatus,
  useUsersAndInvitations,
} from '../../hooks/use-users-and-invitations';
import { AddUsersModal } from '../add-users-modal';
import { ConfirmDeleteUserModal } from '../confirm-delete-user-modal';
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

export function CompanyAndUsersTab() {
  const router = useRouter();
  const {
    records,
    isLoading,
    error,
    deleteUser,
    deleteUserMutation,
    revokeInvitation,
    revokeInvitationMutation,
    resendInvitation,
    resendInvitationMutation,
    inviteUsers,
    // get all users and invitations without pagination TODO: add pagination in the future
  } = useUsersAndInvitations(0, 1000);

  const { user: currentUser } = useAuthStore();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UnifiedUserRecord | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<UnifiedUserRecord | null>(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isResendOpen, setIsResendOpen] = useState(false);

  const handleDeleteRequest = useCallback((record: UnifiedUserRecord) => {
    if (record.type === RecordType.Invitation) {
      return;
    }
    setSelectedUser(record);
    setIsConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedUser || selectedUser.type !== RecordType.User) return;
    deleteUser(selectedUser.id, {
      onSuccess: () => {
        setIsConfirmOpen(false);
        setSelectedUser(null);
      },
    });
  }, [selectedUser, deleteUser]);

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
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => (
          <div className="flex flex-col min-w-0">
            <span className="font-['DM_Sans'] font-medium text-[16px] text-ods-text-primary truncate">
              {row.original.firstName || row.original.lastName
                ? `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim()
                : row.original.email}
            </span>
            <span className="font-['Azeret_Mono'] text-[12px] text-ods-text-secondary truncate">
              {row.original.email}
            </span>
          </div>
        ),
        meta: { width: 'w-1/3' },
      },
      {
        accessorKey: 'roles',
        header: 'ROLE',
        cell: ({ row }: { row: Row<UnifiedUserRecord> }) => (
          <div className="truncate font-['DM_Sans'] text-[16px] text-ods-text-primary">
            {(row.original.roles || []).join(', ') || '—'}
          </div>
        ),
        meta: { width: 'w-1/3' },
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
        meta: { width: 'w-1/3' },
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

          const isDeleted = record.status === UserStatus.Deleted;
          const isOwner = (record.roles || []).some((r: string) => r?.toLowerCase?.() === 'owner');
          const isSelf = currentUser ? record.id === currentUser.id : false;
          const disableDelete = isOwner || isSelf || isDeleted;

          return (
            <div data-no-row-click className="flex gap-2 items-center justify-end pointer-events-auto">
              <MoreActionsMenu
                className="px-4"
                items={[
                  {
                    label: 'Delete',
                    onClick: () => handleDeleteRequest(record),
                    danger: true,
                    disabled: disableDelete,
                  },
                ]}
              />
            </div>
          );
        },
        enableSorting: false,
        meta: { width: 'min-w-[100px] w-auto shrink-0 flex-none', align: 'right' },
      },
    ],
    [currentUser, handleDeleteRequest, handleRevokeRequest, handleRemoveRequest, handleResendRequest],
  );

  const table = useDataTable<UnifiedUserRecord>({
    data: records,
    columns,
    getRowId: (row: UnifiedUserRecord) => row.id,
    enableSorting: false,
  });

  const headerActions = (
    <Button
      onClick={() => setIsAddOpen(true)}
      leftIcon={<PlusCircleIcon iconSize={20} whiteOverlay />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
    >
      Add Users
    </Button>
  );

  const isMutating =
    deleteUserMutation.isPending || revokeInvitationMutation.isPending || resendInvitationMutation.isPending;

  return (
    <ListPageContainer
      title="Openframe"
      headerActions={headerActions}
      background="default"
      padding="none"
      backButton={{ label: 'Back to Settings', onClick: () => router.push('/settings') }}
    >
      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body loading={isLoading || isMutating} emptyMessage={error || 'No users or invitations found.'} />
      </DataTable>
      <ConfirmDeleteUserModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        userName={
          `${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim() || selectedUser?.email || 'user'
        }
        onConfirm={handleConfirmDelete}
      />
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
    </ListPageContainer>
  );
}
