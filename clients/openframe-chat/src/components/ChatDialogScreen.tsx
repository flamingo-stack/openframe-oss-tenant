import { ChatMessageList, type Message } from '@flamingo-stack/openframe-frontend-core';

interface ChatDialogScreenProps {
  messages: Message[];
  dialogId?: string;
  isTyping: boolean;
  isLoadingHistory: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export function ChatDialogScreen({
  messages,
  dialogId,
  isTyping,
  isLoadingHistory,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: ChatDialogScreenProps) {
  return (
    <ChatMessageList
      messages={messages}
      dialogId={dialogId}
      isTyping={isTyping}
      isLoading={isLoadingHistory}
      autoScroll={true}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      // This is the Fae client chat — render the CLIENT command-block variant
      // (frameless, no tool icon, full-text status pill). Set at the list level
      // so both regular messages and synthetic pending-approval rows resolve to
      // 'fae'.
      assistantType="fae"
    />
  );
}
