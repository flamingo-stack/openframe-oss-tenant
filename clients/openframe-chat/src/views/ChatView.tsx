import {
  ChatContainer,
  ChatHeader,
  ChatContent,
  ChatFooter,
  ChatMessageList,
  ChatInput,
  ChatQuickAction
} from '@flamingo/ui-kit'
import { useChat } from '../hooks/useChat'
import { useToken } from '../hooks/useToken'
import faeAvatar from '../assets/fae-avatar.png'

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
  
  return (
    <ChatContainer>
      {/* Token Display Banner */}
      {token && (
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Token:</span>
            <code className="text-xs text-green-400 font-mono bg-gray-800 px-2 py-1 rounded overflow-x-auto whitespace-nowrap flex-1">
              {token}
            </code>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(token)
              console.log('✅ Token copied to clipboard')
            }}
            className="ml-2 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
            title="Copy token to clipboard"
          >
            Copy
          </button>
        </div>
      )}
      
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