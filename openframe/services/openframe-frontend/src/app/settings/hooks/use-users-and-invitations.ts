'use client';

import type { InvitationRecord, InvitationStatus } from './use-invitations';
import { invitationsQueryKeys, useInvitations } from './use-invitations';
import type { UserRecord, UserStatus } from './use-users';
import { usersQueryKeys, useUsers } from './use-users';

// ============ Types ============

export enum RecordType {
  User = 'user',
  Invitation = 'invitation',
}

export type UnifiedUserStatus = UserStatus | InvitationStatus;

export type UnifiedUserRecord = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: UnifiedUserStatus;
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  type: RecordType;
  originalUser?: UserRecord;
  originalInvitation?: InvitationRecord;
};

// Re-export types for convenience
export { invitationsQueryKeys, usersQueryKeys };
export type { InvitationRecord, InvitationStatus, UserRecord };

// ============ Helpers ============

function userToUnified(user: UserRecord): UnifiedUserRecord {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    type: RecordType.User,
    originalUser: user,
  };
}

function invitationToUnified(invitation: InvitationRecord): UnifiedUserRecord {
  return {
    id: invitation.id,
    email: invitation.email,
    firstName: undefined,
    lastName: undefined,
    roles: invitation.roles || [],
    status: invitation.status,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    type: RecordType.Invitation,
    originalInvitation: invitation,
  };
}

// ============ Combined Hook ============

export function useUsersAndInvitations(page: number = 0, size: number = 20) {
  const usersHook = useUsers(page, size);
  const invitationsHook = useInvitations(page, size);

  const records: UnifiedUserRecord[] = [
    ...usersHook.users.map(userToUnified),
    ...invitationsHook.invitations.map(invitationToUnified),
  ];

  const isLoading = usersHook.isLoading || invitationsHook.isLoading;
  const error = usersHook.error || invitationsHook.error;

  const refetchAll = async () => {
    await Promise.all([usersHook.refetch(), invitationsHook.refetch()]);
  };

  return {
    // Data
    records,
    users: usersHook.users,
    invitations: invitationsHook.invitations,

    // Loading & error states
    isLoading,
    error,

    // Pagination info
    usersTotalElements: usersHook.totalElements,
    usersTotalPages: usersHook.totalPages,
    invitationsTotalElements: invitationsHook.totalElements,
    invitationsTotalPages: invitationsHook.totalPages,
    combinedTotalElements: usersHook.totalElements + invitationsHook.totalElements,

    // Refetch
    refetchAll,

    // User mutations
    deleteUser: usersHook.deleteUser,
    deleteUserMutation: usersHook.deleteUserMutation,

    // Invitation mutations
    revokeInvitation: invitationsHook.revokeInvitation,
    revokeInvitationMutation: invitationsHook.revokeInvitationMutation,
    resendInvitation: invitationsHook.resendInvitation,
    resendInvitationMutation: invitationsHook.resendInvitationMutation,
    inviteUsers: invitationsHook.inviteUsers,
    inviteUsersMutation: invitationsHook.inviteUsersMutation,

    // Raw hooks for advanced use cases
    usersHook,
    invitationsHook,
  };
}
