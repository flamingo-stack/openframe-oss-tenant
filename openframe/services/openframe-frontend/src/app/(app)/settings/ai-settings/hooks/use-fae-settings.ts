'use client';

import type { FaeSettings } from '../types/fae-settings';

/**
 * Static mock that returns data shaped like the upcoming `faeSettings` GraphQL
 * query. Once the schema lands replace the body with `useQuery` / `apiClient`
 * graphql call — consumers don't change.
 */
export function useFaeSettings(): { settings: FaeSettings; isLoading: boolean } {
  return {
    isLoading: false,
    settings: MOCK_FAE_SETTINGS,
  };
}

const MOCK_FAE_SETTINGS: FaeSettings = {
  id: 'fs_mock_1',
  organizationId: null,
  assistantName: 'Grace “Fae” Meadows',
  assistantAvatar: null,
  llmProvider: 'ANTHROPIC',
  providerModel: 'Claude Opus 4.1',
  applicationTheme: 'DARK',
  accentColor: '#F357BB',
  answerStyle: 'SHORT',
  customPrompt: null,
  quickActions: [
    {
      id: 'configure-email',
      name: 'Configure Email on New Device',
      instructions:
        'Guide user through email setup for Outlook/mobile. Collect: device type, email client, existing account details. Provide step-by-step configuration with server settings: IMAP/SMTP hosts, ports (993/587), SSL requirements. If authentication fails, create ticket with: username, device info, error messages, attempted steps.',
    },
    {
      id: 'connect-shared-drive',
      name: 'Connect to Shared Drive',
      instructions:
        "Help user map network drives. Get: operating system, drive letter needed, specific share name. Provide commands: Windows - 'net use Z: \\\\server\\share', Mac - 'Connect to Server' steps. Include authentication format: domain\\username. If connection fails, gather: error codes, network location, current permissions, and create ticket for IT review.",
    },
    {
      id: 'request-software-installation',
      name: 'Request Software Installation',
      instructions:
        "Process software installation requests. Collect: exact software name/version, business justification, urgency level, user's role/department. Check against approved software list. For approved items: create ticket with installation priority. For unapproved: explain approval process, security review timeline, and alternative approved solutions.",
    },
  ],
  createdAt: '2026-05-22T00:00:00Z',
  updatedAt: null,
};
