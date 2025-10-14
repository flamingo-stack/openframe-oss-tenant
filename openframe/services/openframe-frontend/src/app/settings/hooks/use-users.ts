'use client'

import { useCallback, useState } from 'react'
import { apiClient } from '../../../lib/api-client'

export type UserRecord = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  roles: string[]
  status: 'ACTIVE' | 'OFFLINE' | 'INVITE_SENT' | string
  createdAt?: string
  updatedAt?: string
}

export type PagedUsersResponse = {
  items: UserRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export function useUsers() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async (nextPage: number = page, nextSize: number = size) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<PagedUsersResponse>(`api/users?page=${nextPage}&size=${nextSize}`)
      if (!res.ok || !res.data) {
        throw new Error(res.error || `Failed to load users (${res.status})`)
      }
      setUsers(res.data.items)
      setPage(res.data.page)
      setSize(res.data.size)
      setTotalPages(res.data.totalPages)
      setTotalElements(res.data.totalElements)
      return res.data
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users'
      setError(msg)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [page, size])

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const res = await apiClient.delete(`/api/users/${encodeURIComponent(userId)}`)
      if (!res.ok) {
        throw new Error(res.error || `Failed to delete user (${res.status})`)
      }
      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete user'
      setError(msg)
      throw e
    }
  }, [])

  return { users, page, size, totalPages, totalElements, isLoading, error, setPage, setSize, fetchUsers, deleteUser }
}


