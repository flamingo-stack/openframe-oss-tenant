import { ChatQuickAction, type ChatTicketItemData, ChatTicketList } from '@flamingo-stack/openframe-frontend-core';
import { ClockHistoryIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { QuickAction } from '../hooks/useChatConfig';
import type { ResumableDialog } from '../services/dialogGraphQLService';

interface ChatInitialScreenProps {
  ticketsEnabled: boolean;
  tickets: ChatTicketItemData[];
  onTicketClick: (ticketId: string) => void | Promise<void>;
  resumableDialog: ResumableDialog | null;
  onResumeDialog: (dialog: ResumableDialog) => void | Promise<void>;
  quickActions: QuickAction[];
  onQuickAction: (text: string) => void;
  isDisconnected: boolean;
}

export function ChatInitialScreen({
  ticketsEnabled,
  tickets,
  onTicketClick,
  resumableDialog,
  onResumeDialog,
  quickActions,
  onQuickAction,
  isDisconnected,
}: ChatInitialScreenProps) {
  const quickHelp = quickActions.length > 0 && (
    <div className="w-full max-w-2xl">
      <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">Quick Help</h3>
      <div className="space-y-1">
        {quickActions.map(action => (
          <ChatQuickAction
            className="bg-ods-card"
            key={action.id}
            text={action.text}
            onAction={onQuickAction}
            disabled={isDisconnected}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 min-h-0">
      <div className="text-center mb-8">
        <h1 className="text-h2 mb-2">Hey! How can I help?</h1>
        <p className="text-h4 text-ods-text-secondary">Describe what's happening and I'll take a look.</p>
      </div>

      {ticketsEnabled ? (
        <>
          <ChatTicketList className="w-full max-w-2xl" tickets={tickets} onTicketClick={onTicketClick} />
          {tickets.length === 0 && quickHelp}
        </>
      ) : (
        <>
          {resumableDialog && (
            <div className="w-full max-w-2xl mb-6">
              <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-3">
                Resume Previous Conversation
              </h3>
              <div
                className="p-4 bg-ods-card rounded-lg border border-ods-border hover:bg-ods-bg-hover transition-colors cursor-pointer"
                onClick={() => onResumeDialog(resumableDialog)}
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
                <div className="flex text-ods-text-secondary">Would you like to continue?</div>
              </div>
            </div>
          )}
          {quickHelp}
        </>
      )}
    </div>
  );
}
