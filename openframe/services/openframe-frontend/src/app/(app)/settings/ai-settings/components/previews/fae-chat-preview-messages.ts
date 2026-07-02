import type { Message } from '@flamingo-stack/openframe-frontend-core/components/chat';

/** Static sample conversation for the read-only chat preview. */
export function buildFaeChatPreviewMessages(assistantName: string, avatarUrl?: string): Message[] {
  // Fixed time so every bubble shows the same stamp.
  const at = new Date();
  at.setHours(14, 47, 0, 0);

  const base = {
    role: 'assistant' as const,
    name: assistantName,
    assistantType: 'fae' as const,
    avatar: avatarUrl ?? null,
    timestamp: at,
  };

  return [
    {
      ...base,
      id: 'preview-1',
      content: "I'll run a quick diagnostic to identify what's causing the performance issues.",
    },
    {
      ...base,
      id: 'preview-2',
      content: [
        {
          type: 'text',
          text: 'I found that your C: drive is 89% full. I can clean up temporary files to free some space – may I proceed with clearing C:/temp?',
        },
        {
          type: 'approval_request',
          status: 'approved',
          data: {
            command: 'Get-ChildItem C:\\temp -Recurse | Remove-Item -Force -Recurse',
            explanation:
              'Removes all temporary files and folders from C:\\temp directory to free up disk space. This PowerShell command recursively deletes contents while forcing removal of read-only files.',
          },
        },
      ],
    },
    {
      ...base,
      id: 'preview-3',
      content: 'Cleaning temporary files now...',
    },
    {
      ...base,
      id: 'preview-4',
      content: "Complete! I've freed up 2.4 GB of disk space, which should help with performance.",
    },
    {
      ...base,
      id: 'preview-5',
      content:
        "I also detected 19 Chrome tabs running under a suspicious parent process that doesn't match your user profile. This could be malware. I'm escalating this to our security team for analysis – please give me a moment. Escalated to technician – awaiting response.",
    },
  ];
}
