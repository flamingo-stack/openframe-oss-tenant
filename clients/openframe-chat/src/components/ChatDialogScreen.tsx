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
      // This is the Fae client chat — render assistant identity as Fae and the
      // end-client approval variant: title-only approval cards with
      // Approve/Reject or a full-text status pill; commands/scripts are never
      // shown to the end client.
      assistantType="fae"
      approvalVariant="client"
    />
  );
}
