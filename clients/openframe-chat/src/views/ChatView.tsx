import { useState, useCallback } from 'react'
import {
  ChatContainer,
  ChatHeader,
  ChatContent,
  ChatFooter,
  ChatMessageList,
  ChatInput,
  ChatQuickAction,
  ModelDisplay
} from '@flamingo-stack/openframe-frontend-core'
import { useChat } from '../hooks/useChat'
import { useConnectionStatus } from '../hooks/useConnectionStatus'
import { supportedModelsService } from '../services/supportedModelsService'
import faeAvatar from '../assets/fae-avatar.png'
import { features } from '../config/features'

export function ChatView() {
  const [currentModel, setCurrentModel] = useState<{
    modelName: string
    provider: string
    contextWindow: number
  } | null>(null)
  
  const handleMetadataUpdate = useCallback((metadata: { modelName: string; providerName: string; contextWindow: number }) => {
    setCurrentModel({
      modelName: metadata.modelName,
      provider: metadata.providerName,
      contextWindow: metadata.contextWindow
    })
  }, [])
  
  const { 
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    handleQuickAction,
    quickActions,
    hasMessages,
    clearMessages,
    awaitingTechnicianResponse
  } = useChat({ 
    useApi: true, 
    useMock: false,
    useNats: features.nats,
    onMetadataUpdate: handleMetadataUpdate
  })
  
  const { status, serverUrl, aiConfiguration, isFullyLoaded } = useConnectionStatus()
  const isDisconnected = status !== 'connected'
  
  const displayModel = currentModel || (aiConfiguration ? {
    modelName: aiConfiguration.modelName,
    provider: aiConfiguration.provider,
    contextWindow: 0
  } : null)

  return (
    <ChatContainer>
      <ChatHeader 
        userAvatar={faeAvatar} 
        showNewChat={hasMessages}
        onNewChat={clearMessages}
        connectionStatus={status}
        serverUrl={serverUrl}
      />
      
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
                      disabled={isDisconnected}
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
          awaitingResponse={awaitingTechnicianResponse}
          placeholder="Enter your request here..."
          className={hasMessages ? "" : "px-4 max-w-2xl mx-auto"}
          reserveAvatarOffset={hasMessages}
          disabled={isDisconnected}
        />
        {displayModel && isFullyLoaded && (
          <div className={hasMessages ? "mx-auto w-full max-w-3xl px-4" : "mx-auto w-full max-w-2xl"}>
            {hasMessages ? (
              <div className="grid grid-cols-[32px_1fr] gap-4 mt-3">
                <div className="invisible h-8 w-8" aria-hidden />
                <ModelDisplay 
                  provider={displayModel.provider}
                  modelName={displayModel.modelName}
                  displayName={supportedModelsService.getModelDisplayName(displayModel.modelName)}
                />
              </div>
            ) : (
              <div className="mt-3">
                <ModelDisplay 
                  provider={displayModel.provider}
                  modelName={displayModel.modelName}
                  displayName={supportedModelsService.getModelDisplayName(displayModel.modelName)}
                />
              </div>
            )}
          </div>
        )}
      </ChatFooter>
    </ChatContainer>
  )
}