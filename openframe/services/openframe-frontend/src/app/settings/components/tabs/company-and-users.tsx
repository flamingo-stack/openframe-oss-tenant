'use client'

import React, { useEffect, useState } from 'react'
import { ListPageContainer, Table, type TableColumn, StatusTag, MoreActionsMenu } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useUsers, type UserRecord } from '../../hooks/use-users'
import { ConfirmDeleteUserModal } from '../confirm-delete-user-modal'
import { AddUsersModal } from '../add-users-modal'
import { Button } from '@flamingo-stack/openframe-frontend-core'
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons'
import { useAuthStore } from '../../../auth/stores/auth-store'
import { useInvitations } from '../../hooks/use-invitations'

export function CompanyAndUsersTab() {
  const { users, size, isLoading, error, fetchUsers, deleteUser } = useUsers()
  const { user: currentUser } = useAuthStore()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const { inviteUsers } = useInvitations()

  useEffect(() => {
    fetchUsers(0, size)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns: TableColumn<UserRecord>[] = [
    {
      key: 'user',
      label: 'USER',
      width: 'w-1/3',
      renderCell: (row) => (
        <div className="flex flex-col min-w-0">
          <span className="font-['DM_Sans'] font-medium text-[16px] text-ods-text-primary truncate">{row.firstName || row.lastName ? `${row.firstName || ''} ${row.lastName || ''}`.trim() : row.email}</span>
          <span className="font-['Azeret_Mono'] text-[12px] text-ods-text-secondary truncate">{row.email}</span>
        </div>
      )
    },
    {
      key: 'roles',
      label: 'ROLE',
      width: 'w-1/3',
      renderCell: (row) => (
        <div className="truncate font-['DM_Sans'] text-[16px] text-ods-text-primary">{(row.roles || []).join(', ') || '—'}</div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 'w-1/3',
      renderCell: (row) => (
        <div className="">
          <StatusTag label={row.status === 'ACTIVE' ? 'ACTIVE' : row.status || 'INACTIVE'} variant={row.status === 'ACTIVE' ? 'success' : 'info'} />
        </div>
      )
    }
  ]

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleDeleteRequest = (user: UserRecord) => {
    setSelectedUser(user)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedUser) return
    try {
      await deleteUser(selectedUser.id)
      await fetchUsers(0, size)
    } catch {}
    setIsConfirmOpen(false)
    setSelectedUser(null)
  }

  const headerActions = (
    <Button
      onClick={() => setIsAddOpen(true)}
      leftIcon={<PlusCircleIcon iconSize={20} whiteOverlay  />}
      className="bg-ods-card border border-ods-border hover:bg-ods-bg-hover text-ods-text-primary px-4 py-2.5 rounded-[6px] font-['DM_Sans'] font-bold text-[16px] h-12"
    >
      Add Users
    </Button>
  )

  return (
    <ListPageContainer title="Openframe" headerActions={headerActions} background="default" padding="none" className="pt-6">
      <Table
        data={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        emptyMessage={error || 'No users found.'}
        showFilters={false}
        renderRowActions={(row: UserRecord) => {
          const isOwner = (row.roles || []).some((r) => r?.toLowerCase?.() === 'owner')
          const isSelf = currentUser ? row.id === currentUser.id : false
          const disableDelete = isOwner || isSelf
          return (
            <MoreActionsMenu 
              className="px-4"
              items={[
                { label: 'Delete', onClick: () => handleDeleteRequest(row), danger: true, disabled: disableDelete }
              ]} 
            />
          )
        }}
      />
      <ConfirmDeleteUserModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        userName={`${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`.trim() || (selectedUser?.email || 'user')}
        onConfirm={handleConfirmDelete}
      />
      <AddUsersModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onInvited={async () => { await fetchUsers(0, size) }}
        invite={async (rows) => {
          await inviteUsers(rows.map(r => r.email))
        }}
      />
    </ListPageContainer>
  )
}


