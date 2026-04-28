import type { Message as ChatMessage, MessageSegment } from '@flamingo-stack/openframe-frontend-core';

/**
 * Scan a side's stored messages and pull out approval_request segments that
 * are still pending, deduping by requestId (first occurrence wins). The
 * synthetic `pending-approvals-*` message produced by
 * `processHistoricalMessagesWithErrors` also carries these segments, so
 * including it in the scan covers both history and realtime.
 */
export function extractPendingApprovals(messages: ChatMessage[]): MessageSegment[] {
  const seen = new Set<string>();
  const pending: MessageSegment[] = [];
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const segment of msg.content) {
      if (segment.type !== 'approval_request' || segment.status !== 'pending') continue;
      const requestId = segment.data?.requestId;
      if (requestId) {
        if (seen.has(requestId)) continue;
        seen.add(requestId);
      }
      pending.push(segment);
    }
  }
  return pending;
}

/**
 * Prepare messages for rendering in ChatMessageList. Drops the synthetic
 * `pending-approvals-*` envelope and strips still-pending approval segments
 * from every other message. Pending approvals are rendered by the sticky
 * `pendingApprovals` prop instead, so this prevents duplicate cards.
 */
export function stripPendingApprovals(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  for (const msg of messages) {
    if (msg.id.startsWith('pending-approvals-')) continue;
    if (!Array.isArray(msg.content)) {
      result.push(msg);
      continue;
    }
    const filteredContent = msg.content.filter(
      segment => !(segment.type === 'approval_request' && segment.status === 'pending'),
    );
    result.push(filteredContent.length === msg.content.length ? msg : { ...msg, content: filteredContent });
  }
  return result;
}
