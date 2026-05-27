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
    <div className="w-full max-w-ods-content-narrow">
      <h3 className="text-xs uppercase tracking-wider text-ods-text-secondary mb-[var(--spacing-system-sf)]">
        Quick Help
      </h3>
      <div className="space-y-[var(--spacing-system-xxs)]">
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

  const hasTickets = tickets.length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-[var(--spacing-system-mf)] py-[var(--spacing-system-l)]">
      <div className="w-full max-w-ods-content-narrow text-center mb-[var(--spacing-system-lf)] shrink-0">
        <h1 className="text-h2 mb-[var(--spacing-system-xsf)]">Hey! How can I help?</h1>
        <p className="text-h4 text-ods-text-secondary">Describe what's happening and I'll take a look.</p>
      </div>

      {hasTickets ? (
        <ChatTicketList
          className="w-full max-w-ods-content-narrow [&_button:last-child]:border-b-0"
          tickets={tickets}
          onTicketClick={onTicketClick}
        />
      ) : (
        quickHelp
      )}
    </div>
  );
}
