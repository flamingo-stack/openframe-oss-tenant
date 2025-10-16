import {
  ChatContainer,
  ChatHeader,
  ChatContent,
  ChatFooter,
  ChatMessageList,
  ChatInput,
  ChatQuickAction
} from '@flamingo/ui-kit'
import { useChat, type Message } from '../hooks/useChat'
import { useToken } from '../hooks/useToken'
import { useMemo } from 'react'
import { MessageSegment } from '../types/chat.types'
import faeAvatar from '../assets/fae-avatar.png'

/**
 * Transform messages to ensure content is always a string for ChatMessageList
 */
function transformMessagesForDisplay(messages: Message[]): Message[] {
  return messages.map(message => {
    // If content is already a string, return as-is
    if (typeof message.content === 'string') {
      return message
    }
    
    // If content is an array of segments, extract text
    if (Array.isArray(message.content)) {
      const textContent = message.content
        .filter((segment: MessageSegment) => segment.type === 'text')
        .map((segment: MessageSegment) => segment.type === 'text' ? segment.text : '')
        .join('')
      
      return {
        ...message,
        content: textContent
      }
    }
    
    return message
  })
}

export function ChatView() {
  const DEBUG_MODE = false
  const token = useToken()
  
  const { 
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    handleQuickAction,
    quickActions,
    hasMessages
  } = useChat({ useApi: true, useMock: false, debugMode: DEBUG_MODE })
  
  // Transform messages to ensure content is strings for ChatMessageList
  const displayMessages = useMemo(() => transformMessagesForDisplay(messages), [messages])
  
  return (
    <ChatContainer>
      <ChatHeader userAvatar={faeAvatar} />
      
      <ChatContent>
        {hasMessages ? (
          <ChatMessageList
            messages={displayMessages}
            isTyping={isTyping}
            autoScroll={true}
          />
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-light text-white mb-2">
                Hey! How can I help?
              </h1>
              <p className="text-gray-400">
                Describe what's happening and I'll take a look.
              </p>
            </div>
            
            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="w-full max-w-2xl">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">
                  Quick Help
                </h3>
                <div className="space-y-2">
                  {quickActions.map((action) => (
                    <ChatQuickAction
                      key={action.id}
                      text={action.text}
                      onAction={handleQuickAction}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ChatContent>
      
      <ChatFooter>
        <ChatInput
          onSend={sendMessage}
          sending={isStreaming}
          placeholder="Enter your request here..."
          className="px-12"
          reserveAvatarOffset={false}
        />
      </ChatFooter>
    </ChatContainer>
  )
}