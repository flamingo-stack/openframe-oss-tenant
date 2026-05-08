import type { Message as ChatMessage, MessageSegment } from '@flamingo-stack/openframe-frontend-core';

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

export function extractPendingApprovals<M extends ChatMessage>(messages: M[]): MessageSegment[] {
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

// Pending cards render via the sticky `pendingApprovals` prop; resolved ones
// stay inline so the outcome shows in the chat flow.
export function stripPendingApprovals<M extends ChatMessage>(messages: M[]): M[] {
  const result: M[] = [];
  for (const msg of messages) {
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
