// Dialog constants and enums

export const DIALOG_STATUS = {
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'RESOLVED',
  ACTIVE: 'ACTIVE',
} as const

export type DialogStatus = typeof DIALOG_STATUS[keyof typeof DIALOG_STATUS]

export const CHAT_TYPE = {
  CLIENT: 'CLIENT_CHAT',
  ADMIN: 'ADMIN_AI_CHAT',
} as const

export type ChatType = typeof CHAT_TYPE[keyof typeof CHAT_TYPE]

export const MESSAGE_TYPE = {
  TEXT: 'TEXT',
  EXECUTING_TOOL: 'EXECUTING_TOOL',
  EXECUTED_TOOL: 'EXECUTED_TOOL',
  APPROVAL_REQUEST: 'APPROVAL_REQUEST',
  APPROVAL_RESULT: 'APPROVAL_RESULT',
  ERROR: 'ERROR',
  MESSAGE_START: 'MESSAGE_START',
  MESSAGE_END: 'MESSAGE_END',
  MESSAGE_REQUEST: 'MESSAGE_REQUEST',
} as const

export type MessageType = typeof MESSAGE_TYPE[keyof typeof MESSAGE_TYPE]

export const OWNER_TYPE = {
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
  ASSISTANT: 'ASSISTANT',
} as const

export type OwnerType = typeof OWNER_TYPE[keyof typeof OWNER_TYPE]

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS]

export const ASSISTANT_CONFIG = {
  FAE: {
    type: 'fae' as const,
    name: 'Fae',
  },
  MINGO: {
    type: 'mingo' as const,
    name: 'Mingo',
  },
} as const

export type AssistantType = typeof ASSISTANT_CONFIG[keyof typeof ASSISTANT_CONFIG]['type']

export const API_ENDPOINTS = {
  APPROVAL_REQUEST: '/chat/api/v1/approval-requests',
  SEND_MESSAGE: '/chat/api/v2/messages',
  DIALOG_CHUNKS: '/chat/api/v1/dialogs',
} as const

export const NATS_TOPICS = {
  MESSAGE: 'message',
  ADMIN_MESSAGE: 'admin-message',
} as const

export type NatsMessageType = typeof NATS_TOPICS[keyof typeof NATS_TOPICS]

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'of_access_token',
} as const

export const NETWORK_CONFIG = {
  SHARED_CLOSE_DELAY_MS: 3000,
  CONNECT_TIMEOUT_MS: 10_000,
  RECONNECT_TIME_WAIT_MS: 2000,
  PING_INTERVAL_MS: 30_000,
  MAX_PING_OUT: 3,
  DEFAULT_MESSAGE_LIMIT: 50,
  POLL_MESSAGE_LIMIT: 10,
} as const
