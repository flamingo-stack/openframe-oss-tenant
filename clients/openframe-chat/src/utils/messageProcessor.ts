import {
  CHAT_TYPE,
  processHistoricalMessagesWithErrors,
  type HistoricalMessage,
  type Message
} from '@flamingo-stack/openframe-frontend-core'
import type { Message as GraphQLMessage } from '../services/dialogGraphQLService'
import faeAvatar from '../assets/fae-avatar.png'

/**
 * Process historical messages from GraphQL into chat display format
 */
export function processHistoricalMessages(
  messages: GraphQLMessage[],
  onApprove?: (requestId?: string) => Promise<void>,
  onReject?: (requestId?: string) => Promise<void>
): Message[] {
  const historicalMessages: HistoricalMessage[] = messages.map(msg => ({
    id: msg.id,
    dialogId: msg.dialogId,
    chatType: msg.chatType,
    createdAt: msg.createdAt,
    owner: msg.owner,
    messageData: msg.messageData,
  }))

  const processed = processHistoricalMessagesWithErrors(historicalMessages, {
    assistantName: 'Fae',
    assistantType: 'fae',
    assistantAvatar: faeAvatar,
    chatTypeFilter: CHAT_TYPE.CLIENT,
    onApprove,
    onReject,
  })

  return processed.messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    name: msg.name,
    content: msg.content,
    timestamp: msg.timestamp,
    avatar: msg.role === 'assistant' || msg.role === 'error' ? faeAvatar : undefined,
  })) as Message[]
}
