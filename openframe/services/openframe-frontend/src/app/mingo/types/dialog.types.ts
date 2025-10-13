export type DialogStatus =
  | 'ACTIVE'
  | 'ACTION_REQUIRED'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'ARCHIVED'

export type DialogOwnerEnum = 'CLIENT'

export interface DialogOwner {
  type: DialogOwnerEnum
}

export interface ClientDialogOwner extends DialogOwner {
  machineId: string
}

export interface DialogRating {
  id: string
  dialogId: string
  rating: number
  createdAt: string
}

export interface Dialog {
  id: string
  title: string
  status: DialogStatus
  owner: ClientDialogOwner | DialogOwner
  createdAt: string
  statusUpdatedAt?: string | null
  resolvedAt?: string | null
  aiResolutionSuggestedAt?: string | null
  rating?: DialogRating | null
}

export interface CursorPageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor?: string | null
  endCursor?: string | null
}

export interface DialogEdge {
  cursor: string
  node: Dialog
}

export interface DialogConnection {
  edges: DialogEdge[]
  pageInfo: CursorPageInfo
}