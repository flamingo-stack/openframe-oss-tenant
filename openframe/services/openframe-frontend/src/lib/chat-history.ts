import type { Message as ChatMessage, MessageSegment } from '@flamingo-stack/openframe-frontend-core';

// Newest-to-oldest scan for the latest pending approval (single or batch).
// Returns its requestId / approvalRequestId, or undefined if none. Used by
// send-message handlers to optimistically flip the active approval gate to
// `rejected` when the user interrupts, so the card resolves in the same
// frame as the user-message bubble (no flicker between the two updates).
export function findLatestPendingApprovalId<M extends ChatMessage>(messages: M[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!Array.isArray(msg.content)) continue;
    for (let j = msg.content.length - 1; j >= 0; j--) {
      const seg = msg.content[j] as MessageSegment;
      if (seg.type === 'approval_request' && (!seg.status || seg.status === 'pending')) {
        return seg.data?.requestId;
      }
      if (seg.type === 'approval_batch' && (!seg.status || seg.status === 'pending')) {
        return seg.data?.approvalRequestId;
      }
    }
  }
  return undefined;
}

// The core lib lifts approval segments out of the original assistant turn into
// a separate `pending-approvals-*` envelope. Fold them back so the trailing
// message stays a normal in-progress turn that streaming chunks can resume.
export function foldPendingApprovalsEnvelope<M extends ChatMessage>(messages: M[]): M[] {
  const result: M[] = [];
  for (const msg of messages) {
    const isEnvelope = typeof msg.id === 'string' && msg.id.startsWith('pending-approvals-');
    if (isEnvelope && Array.isArray(msg.content)) {
      for (let j = result.length - 1; j >= 0; j--) {
        const prev = result[j];
        if (prev.role !== 'assistant') break;
        const prevSegments = Array.isArray(prev.content) ? prev.content : [];
        result[j] = { ...prev, content: [...prevSegments, ...msg.content] };
        break;
      }
      continue;
    }
    result.push(msg);
  }
  return result;
}

export function extractPendingApprovals<M extends ChatMessage>(
  messages: M[],
  resolvedStatuses?: Record<string, string | undefined>,
): MessageSegment[] {
  // A request that is resolved anywhere — in the consumer's approval-status
  // map (realtime flipped it) or as a resolved segment in any copy — must
  // not surface as a sticky pending card, even when a stale duplicate copy
  // is still `pending` (history re-process can resurrect one before the
  // resolved realtime copy in `[...storeMessages, ...realtimeOnly]`).
  const resolved = new Set<string>();
  if (resolvedStatuses) {
    for (const [id, status] of Object.entries(resolvedStatuses)) {
      if (status === 'approved' || status === 'rejected') resolved.add(id);
    }
  }
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const segment of msg.content) {
      if (segment.type === 'approval_request') {
        if ((segment.status === 'approved' || segment.status === 'rejected') && segment.data?.requestId) {
          resolved.add(segment.data.requestId);
        }
      } else if (segment.type === 'approval_batch') {
        if ((segment.status === 'approved' || segment.status === 'rejected') && segment.data?.approvalRequestId) {
          resolved.add(segment.data.approvalRequestId);
        }
      }
    }
  }

  const seen = new Set<string>();
  const pending: MessageSegment[] = [];
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue;
    for (const segment of msg.content) {
      if (segment.type !== 'approval_request' || segment.status !== 'pending') continue;
      const requestId = segment.data?.requestId;
      if (requestId) {
        if (resolved.has(requestId) || seen.has(requestId)) continue;
        seen.add(requestId);
      }
      pending.push(segment);
    }
  }
  return pending;
}

// Pending cards render via the sticky `pendingApprovals` prop; resolved ones
// stay inline so the outcome shows in the chat flow.
// Also dedupes approval_request/approval_batch segments by requestId across
// bubbles (first occurrence wins) — the agent re-asks for the same approval
// when the user interrupts, and the cross-message status updater flips every
// matching segment, so without dedupe a single rejected approval would render
// in every retry's bubble. Assistant bubbles that become empty after filter
// are dropped entirely to avoid orphan bubbles holding only a deduped card.
export function stripPendingApprovals<M extends ChatMessage>(messages: M[]): M[] {
  const result: M[] = [];
  const seenApprovalIds = new Set<string>();
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) {
      result.push(msg);
      continue;
    }
    const filteredContent = msg.content.filter(segment => {
      if (segment.type === 'approval_request' && segment.status === 'pending') return false;

      if (segment.type === 'approval_request') {
        const id = segment.data?.requestId;
        if (id) {
          if (seenApprovalIds.has(id)) return false;
          seenApprovalIds.add(id);
        }
      } else if (segment.type === 'approval_batch') {
        const id = segment.data?.approvalRequestId;
        if (id) {
          if (seenApprovalIds.has(id)) return false;
          seenApprovalIds.add(id);
        }
      }
      return true;
    });

    if (msg.role === 'assistant' && filteredContent.length === 0) continue;
    result.push(filteredContent.length === msg.content.length ? msg : { ...msg, content: filteredContent });
  }
  return result;
}
