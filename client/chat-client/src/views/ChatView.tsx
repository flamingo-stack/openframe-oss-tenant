import { 
  ChatContainer, 
  ChatHeader, 
  ChatContent, 
  ChatFooter
} from '../../../../../ui-kit/src/components/chat/chat-container'
import {
  ChatMessageList,
  ChatInput,
  ChatQuickAction
} from '../../../../../ui-kit/src/components/chat'
import { useChat } from '../hooks/useChat'
import faeAvatar from '../assets/fae-avatar.png'

export function ChatView() {
  const { 
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    handleQuickAction,
    quickActions,
    hasMessages
  } = useChat({ useMock: true })
  
  return (
    <ChatContainer>
      <ChatHeader userAvatar={faeAvatar} />
      
      <ChatContent>
        {hasMessages ? (
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            autoScroll={true}
          />
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-light text-white mb-2">
                Hey John! How can I help?
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
          className="pr-12 pl-12 !mx-0 max-w-none"
          reserveAvatarOffset={false}
        />
      </ChatFooter>
    </ChatContainer>
  )
}