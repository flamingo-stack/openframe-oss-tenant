import { ChatQuickAction, type ChatTicketItemData, ChatTicketList } from '@flamingo-stack/openframe-frontend-core';
import type { QuickAction } from '../hooks/useChatConfig';

interface ChatInitialScreenProps {
  tickets: ChatTicketItemData[];
  onTicketClick: (ticketId: string) => void | Promise<void>;
  quickActions: QuickAction[];
  onQuickAction: (text: string) => void;
  isDisconnected: boolean;
}

export function ChatInitialScreen({
  tickets,
  onTicketClick,
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

      <ChatTicketList className="w-full max-w-2xl" tickets={tickets} onTicketClick={onTicketClick} />
      {tickets.length === 0 && quickHelp}
    </div>
  );
}
