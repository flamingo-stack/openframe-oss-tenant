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
    />
  );
}
