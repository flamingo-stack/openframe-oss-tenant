import {
  ChatContainer,
  ChatContent,
  ChatFooter,
  ChatHeader,
  ChatInput,
  ChatMessageList,
  ChatQuickAction,
  ModelDisplay,
} from '@flamingo-stack/openframe-frontend-core';
import { ClockHistoryIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useCallback, useEffect, useState } from 'react';
import faeAvatar from '../assets/fae-avatar.png';
import { features } from '../config/features';
import { useChat } from '../hooks/useChat';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { dialogGraphQlService, type ResumableDialog } from '../services/dialogGraphQLService';
import { supportedModelsService } from '../services/supportedModelsService';

export function ChatView() {
  const [currentModel, setCurrentModel] = useState<{
    modelName: string;
    provider: string;
    contextWindow: number;
  } | null>(null);
  const [resumableDialog, setResumableDialog] = useState<ResumableDialog | null>(null);

  const handleMetadataUpdate = useCallback(
    (metadata: { modelName: string; providerName: string; contextWindow: number }) => {
      setCurrentModel({
        modelName: metadata.modelName,
        provider: metadata.providerName,
        contextWindow: metadata.contextWindow,
      });
    },
    [],
  );

  const {
    messages,
    isTyping,
    isStreaming,
    sendMessage,
    handleQuickAction,
    quickActions,
    hasMessages,
    clearMessages,
    resumeDialog,
    awaitingTechnicianResponse,
    isLoadingHistory,
  } = useChat({
    useApi: true,
    useNats: features.nats,
    onMetadataUpdate: handleMetadataUpdate,
  });

  const fetchResumableDialog = useCallback(() => {
    dialogGraphQlService.getResumableDialog().then(dialog => {
      setResumableDialog(dialog);
    });
  }, []);

  useEffect(() => {
    // Fetch resumable dialog on component mount
    fetchResumableDialog();
  }, [fetchResumableDialog]);

  const handleNewChat = useCallback(() => {
    clearMessages();
    // Fetch resumable dialog after clearing messages
    fetchResumableDialog();
  }, [clearMessages, fetchResumableDialog]);

  const { status, serverUrl, aiConfiguration, isFullyLoaded } = useConnectionStatus();
  const isDisconnected = status !== 'connected';

  const displayModel =
    currentModel ||
    (aiConfiguration
      ? {
          modelName: aiConfiguration.modelName,
          provider: aiConfiguration.provider,
          contextWindow: 0,
        }
      : null);

  return (
    <ChatContainer>
      <ChatHeader
        userAvatar={faeAvatar}
        showNewChat={hasMessages}
        onNewChat={handleNewChat}
        connectionStatus={status}
        serverUrl={serverUrl}
      />

      <ChatContent>
        {hasMessages ? (
          <ChatMessageList messages={messages} isTyping={isTyping} isLoading={isLoadingHistory} autoScroll={true} />
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-light text-white mb-2">Hey! How can I help?</h1>
              <p className="text-gray-400">Describe what's happening and I'll take a look.</p>
            </div>

            {/* Resumable Dialog */}
            {resumableDialog && (
              <div className="w-full max-w-2xl mb-6">
                <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">
                  Resume Previous Conversation
                </h3>
                <div
                  className="p-4 bg-ods-card rounded-lg border border-ods-border hover:bg-ods-bg-hover transition-colors cursor-pointer"
                  onClick={async () => {
                    const success = await resumeDialog(resumableDialog.id);
                    if (success) {
                      setResumableDialog(null); // Clear resumable dialog after successful resume
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="flex gap-2 text-ods-text-primary font-medium">
                      <ClockHistoryIcon />
                      Last Topic: {resumableDialog.title || 'Untitled Conversation'}
                    </h4>
                    <span className="text-xs text-ods-text-secondary">
                      {new Date(resumableDialog.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex text-ods-text-secondary">Whould you like to continue?</div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="w-full max-w-2xl">
                <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">Quick Help</h3>
                <div className="space-y-1">
                  {quickActions.map(action => (
                    <ChatQuickAction
                      className="bg-ods-card"
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
          className={hasMessages ? '' : 'max-w-2xl mx-auto'}
          reserveAvatarOffset={hasMessages}
          disabled={isDisconnected}
        />
        {displayModel && isFullyLoaded && (
          <div className={hasMessages ? 'mx-auto w-full max-w-3xl px-4' : 'mx-auto w-full max-w-2xl'}>
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
  );
}
