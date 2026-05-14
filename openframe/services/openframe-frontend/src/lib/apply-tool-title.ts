/**
 * Backend `EXECUTING_TOOL` payloads carry an optional `title` field that should
 * be shown as the block header. The matching `EXECUTED_TOOL` event has no
 * `title`, but the core-library merges both into a single `tool_execution`
 * segment by `toolExecutionRequestId` and the last write wins, so we must
 * carry the title onto the `EXECUTED_TOOL` payload as well — otherwise it
 * gets overwritten with the raw `toolFunction` after completion.
 *
 * We remember `toolExecutionRequestId -> title` and substitute
 * `toolFunction = title` for both events. Fallback to original `toolFunction`
 * when title is absent.
 */
type ToolLike = {
  type?: string;
  title?: string;
  toolFunction?: string;
  toolExecutionRequestId?: string;
  [key: string]: unknown;
};

const MAX_ENTRIES = 1000;
const titleByExecutionId = new Map<string, string>();

function rememberTitle(id: string, title: string): void {
  if (titleByExecutionId.size >= MAX_ENTRIES) {
    const firstKey = titleByExecutionId.keys().next().value;
    if (firstKey !== undefined) titleByExecutionId.delete(firstKey);
  }
  titleByExecutionId.set(id, title);
}

export function overrideToolTitle<T extends ToolLike>(data: T): T {
  if (!data) return data;
  const id = typeof data.toolExecutionRequestId === 'string' ? data.toolExecutionRequestId : '';

  if (data.type === 'EXECUTING_TOOL' && typeof data.title === 'string' && data.title.length > 0) {
    if (id) rememberTitle(id, data.title);
    return { ...data, toolFunction: data.title };
  }

  if (data.type === 'EXECUTED_TOOL' && id) {
    const title = titleByExecutionId.get(id);
    if (title) return { ...data, toolFunction: title };
  }

  return data;
}

export function applyToolTitleToMessage<T extends { messageData?: unknown }>(message: T): T {
  const md = message.messageData;
  if (Array.isArray(md)) {
    return { ...message, messageData: md.map(item => overrideToolTitle(item as ToolLike)) };
  }
  if (md && typeof md === 'object') {
    return { ...message, messageData: overrideToolTitle(md as ToolLike) };
  }
  return message;
}
