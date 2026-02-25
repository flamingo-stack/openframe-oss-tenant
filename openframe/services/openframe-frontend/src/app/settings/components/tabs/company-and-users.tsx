'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ListPageContainer,
  MoreActionsMenu,
  StatusTag,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';
import { useAuthStore } from '../../../auth/stores/auth-store';
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
  [UserStatus.Deleted]: 'info',
  [InvitationStatus.Pending]: 'warning',
  [InvitationStatus.Expired]: 'error',
  // TODO: import status type from flamingo-stack-frontend-core
} as const satisfies Record<UnifiedUserStatus, 'success' | 'info' | 'warning' | 'error'>;

export function CompanyAndUsersTab() {
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

  const columns: TableColumn<UnifiedUserRecord>[] = [
    {
      key: 'user',
      label: 'USER',
      width: 'w-1/3',
      renderCell: row => (
        <div className="flex flex-col min-w-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] text-ods-text-primary truncate">
            {row.firstName || row.lastName ? `${row.firstName || ''} ${row.lastName || ''}`.trim() : row.email}
          </span>
          <span className="font-['Azeret_Mono'] text-[12px] text-ods-text-secondary truncate">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'roles',
      label: 'ROLE',
      width: 'w-1/3',
      renderCell: row => (
        <div className="truncate font-['DM_Sans'] text-[16px] text-ods-text-primary">
          {(row.roles || []).join(', ') || '—'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-1/3',
      renderCell: row => {
        const statusLabel = row.status;
        const variant = statusToVariant[statusLabel];
        const label = statusToLabel[statusLabel];

        return (
          <div className="">
            <StatusTag label={label} variant={variant} />
          </div>
        );
      },
    },
  ];

  const handleDeleteRequest = (record: UnifiedUserRecord) => {
    if (record.type === RecordType.Invitation) {
      return;
    }
    setSelectedUser(record);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser || selectedUser.type !== RecordType.User) return;
    deleteUser(selectedUser.id, {
      onSuccess: () => {
        setIsConfirmOpen(false);
        setSelectedUser(null);
      },
    });
  };

  const handleRevokeRequest = (record: UnifiedUserRecord) => {
    if (record.type !== RecordType.Invitation) {
      return;
    }
    setSelectedInvitation(record);
    setIsRevokeOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedInvitation || selectedInvitation.type !== RecordType.Invitation) return;
    revokeInvitation(selectedInvitation.id, {
      onSuccess: () => {
        setIsRevokeOpen(false);
        setSelectedInvitation(null);
      },
    });
  };

  const handleRemoveRequest = (record: UnifiedUserRecord) => {
    if (record.type !== RecordType.Invitation) return;
    setSelectedInvitation(record);
    setIsRemoveOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedInvitation || selectedInvitation.type !== RecordType.Invitation) return;
    revokeInvitation(selectedInvitation.id, {
      onSuccess: () => {
        setIsRemoveOpen(false);
        setSelectedInvitation(null);
      },
    });
  };

  const handleResendRequest = (record: UnifiedUserRecord) => {
    if (record.type !== RecordType.Invitation) return;
    setSelectedInvitation(record);
    setIsResendOpen(true);
  };

  const handleConfirmResend = async () => {
    if (!selectedInvitation || selectedInvitation.type !== RecordType.Invitation) return;
    resendInvitation(selectedInvitation.id, {
      onSuccess: () => {
        setIsResendOpen(false);
        setSelectedInvitation(null);
      },
    });
  };

  const handleInviteUsers = async (rows: { email: string }[]) => {
    await inviteUsers(rows.map(r => r.email));
  };

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
      className="pt-6"
    >
      <Table
        data={records}
        columns={columns}
        rowKey="id"
        loading={isLoading || isMutating}
        emptyMessage={error || 'No users or invitations found.'}
        showFilters={false}
        renderRowActions={(row: UnifiedUserRecord) => {
          if (row.type === RecordType.Invitation) {
            const isExpired = row.status === InvitationStatus.Expired;

            if (isExpired) {
              return (
                <MoreActionsMenu
                  className="px-4"
                  items={[
                    { label: 'Resend', onClick: () => handleResendRequest(row) },
                    { label: 'Remove', onClick: () => handleRemoveRequest(row), danger: true },
                  ]}
                />
              );
            }

            return (
              <MoreActionsMenu
                className="px-4"
                items={[{ label: 'Revoke', onClick: () => handleRevokeRequest(row), danger: true }]}
              />
            );
          }

          const isDeleted = row.status === UserStatus.Deleted;
          const isOwner = (row.roles || []).some(r => r?.toLowerCase?.() === 'owner');
          const isSelf = currentUser ? row.id === currentUser.id : false;
          const disableDelete = isOwner || isSelf || isDeleted;

          return (
            <MoreActionsMenu
              className="px-4"
              items={[
                { label: 'Delete', onClick: () => handleDeleteRequest(row), danger: true, disabled: disableDelete },
              ]}
            />
          );
        }}
      />
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
