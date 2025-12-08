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

export interface Machine {
  id: string
  machineId: string
  displayName?: string
  hostname?: string
  organizationId?: string
}

export interface ClientDialogOwner extends DialogOwner {
  machineId: string
  machine?: Machine
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

// Message types
export type MessageOwnerType = 'CLIENT' | 'ASSISTANT' | 'ADMIN'
export type ChatType = string
export type DialogMode = string
export type MessageDataType = 'TEXT' | 'ERROR' | 'EXECUTING_TOOL' | 'EXECUTED_TOOL'

export interface MessageOwner {
  type: MessageOwnerType
}

export interface ClientOwner extends MessageOwner {
  machineId: string
}

export interface AssistantOwner extends MessageOwner {
  model: string
}

export interface AdminOwner extends MessageOwner {
  userId: string
  user?: {
    id: string
  }
}

export interface MessageData {
  type: MessageDataType
}

export interface TextData extends MessageData {
  text: string
}

export interface ErrorData extends MessageData {
  error: string
  details?: string
}

export interface ExecutingToolData extends MessageData {
  type: 'EXECUTING_TOOL'
  integratedToolType: string
  toolFunction: string
  parameters?: Record<string, any>
  requiresApproval?: boolean
  approvalStatus?: string
}

export interface ExecutedToolData extends MessageData {
  type: 'EXECUTED_TOOL'
  integratedToolType: string
  toolFunction: string
  result?: string
  success?: boolean
  requiredApproval?: boolean
  approvalStatus?: string
}

export interface Message {
  id: string
  dialogId: string
  chatType: ChatType
  dialogMode: DialogMode
  createdAt: string
  owner: ClientOwner | AssistantOwner | AdminOwner | MessageOwner
  messageData: TextData | ErrorData | ExecutingToolData | ExecutedToolData | MessageData
}

export interface MessageEdge {
  cursor: string
  node: Message
}

export interface MessageConnection {
  edges: MessageEdge[]
  pageInfo: CursorPageInfo
}