export interface KnowledgeBaseFolder {
  id: string;
  type: 'folder';
  name: string;
  parentFolderId?: string;
}

export interface ArticleAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export type ArticleStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

export interface ArticleAuthor {
  name: string;
  avatarUrl?: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  type: 'article';
  name: string;
  description: string;
  createdAt: string;
  folderId?: string;
  tags?: string[];
  body?: string;
  attachments?: ArticleAttachment[];
  author?: ArticleAuthor;
  updatedAt?: string;
  status?: ArticleStatus;
}

export type KnowledgeBaseItem = KnowledgeBaseFolder | KnowledgeBaseArticle;

export const mockKnowledgeBaseItems: KnowledgeBaseItem[] = [
  // Root-level folders
  { id: 'folder-1', type: 'folder', name: 'Getting Started' },
  { id: 'folder-2', type: 'folder', name: 'Device Management' },
  { id: 'folder-3', type: 'folder', name: 'Troubleshooting' },

  // Nested under "Getting Started"
  { id: 'folder-1-1', type: 'folder', name: 'Onboarding', parentFolderId: 'folder-1' },
  { id: 'folder-1-2', type: 'folder', name: 'Authentication', parentFolderId: 'folder-1' },

  // Nested under "Device Management"
  { id: 'folder-2-1', type: 'folder', name: 'Fleet MDM', parentFolderId: 'folder-2' },
  { id: 'folder-2-2', type: 'folder', name: 'Tactical RMM', parentFolderId: 'folder-2' },

  // Articles — mixed across root, intermediate, and leaf folders
  {
    id: 'article-root-welcome',
    type: 'article',
    name: 'Welcome to OpenFrame',
    description: 'A short overview of the platform and what you can do with it.',
    createdAt: '2026-04-05T10:00:00.000Z',
    updatedAt: '2026-04-05T10:00:00.000Z',
    status: 'PUBLISHED',
    author: { name: 'Priya Patel' },
    tags: ['overview'],
    body: '# Welcome to OpenFrame\n\nGet started with the core concepts and the dashboard.',
    attachments: [],
  },
  {
    id: 'article-getting-started-quick',
    type: 'article',
    name: 'Quick start checklist',
    description: 'The 5-minute path from signup to your first connected device.',
    createdAt: '2026-04-08T13:15:00.000Z',
    updatedAt: '2026-04-08T13:15:00.000Z',
    status: 'PUBLISHED',
    author: { name: 'Mike Rodriguez' },
    folderId: 'folder-1',
    tags: ['onboarding'],
    body: '# Quick start checklist\n\n1. Create an organization.\n2. Invite a user.\n3. Connect a device.',
    attachments: [],
  },
  {
    id: 'article-device-mgmt-overview',
    type: 'article',
    name: 'Choosing between RMM and MDM',
    description: 'When to reach for Tactical RMM vs Fleet MDM for fleet management.',
    createdAt: '2026-04-18T08:42:00.000Z',
    updatedAt: '2026-04-18T08:42:00.000Z',
    status: 'PUBLISHED',
    author: { name: 'Sam Chen' },
    folderId: 'folder-2',
    tags: ['devices'],
    body: '# Choosing between RMM and MDM\n\nUse RMM for hands-on operations, MDM for policy-driven mobile device control.',
    attachments: [],
  },
  {
    id: 'article-1',
    type: 'article',
    name: 'How to onboard a new device',
    description: 'Step-by-step guide for adding a device to OpenFrame and verifying its status.',
    createdAt: '2026-04-12T09:32:00.000Z',
    updatedAt: '2026-04-12T09:32:00.000Z',
    status: 'PUBLISHED',
    author: { name: 'Mike Rodriguez' },
    folderId: 'folder-1-1',
    tags: ['onboarding', 'devices'],
    body: '# How to onboard a new device\n\nFollow these steps to register a new device with OpenFrame.',
    attachments: [
      {
        id: 'att-1',
        fileName: 'onboarding-checklist.pdf',
        fileSize: 184_320,
        contentType: 'application/pdf',
      },
    ],
  },
  {
    id: 'article-2',
    type: 'article',
    name: 'Configuring SSO providers',
    description: 'Set up SAML or OIDC providers and manage allowed domains for tenant access.',
    createdAt: '2026-04-15T14:08:00.000Z',
    updatedAt: '2026-04-15T14:08:00.000Z',
    status: 'PUBLISHED',
    author: { name: 'Priya Patel' },
    folderId: 'folder-1-2',
    tags: ['sso', 'auth'],
    body: '# Configuring SSO providers\n\nThis guide covers SAML and OIDC setup.',
    attachments: [],
  },
  {
    id: 'article-3',
    type: 'article',
    name: 'Running scripts at scale',
    description: 'Best practices for scheduling and executing scripts across device fleets.',
    createdAt: '2026-04-20T11:21:00.000Z',
    updatedAt: '2026-04-20T11:21:00.000Z',
    status: 'DRAFT',
    author: { name: 'Sam Chen' },
    folderId: 'folder-2-2',
    tags: ['scripts', 'automation'],
    body: '# Running scripts at scale\n\nUse the script scheduler to manage fleet-wide jobs.',
    attachments: [],
  },
  {
    id: 'article-4',
    type: 'article',
    name: 'Investigating offline agents',
    description: 'A short triage checklist for diagnosing devices that fail to check in.',
    createdAt: '2026-04-23T16:45:00.000Z',
    updatedAt: '2026-04-23T16:45:00.000Z',
    status: 'PUBLISHED',
    author: { name: 'Lena Volkova' },
    folderId: 'folder-3',
    tags: ['troubleshooting', 'agents'],
    body: '# Investigating offline agents\n\nStart with the agent log and connectivity check.',
    attachments: [],
  },

  // Archived articles
  {
    id: 'article-archived-1',
    type: 'article',
    name: 'Legacy NiFi pipeline guide',
    description: 'Historical reference for the deprecated NiFi-based ingestion pipeline.',
    createdAt: '2025-11-02T10:00:00.000Z',
    updatedAt: '2026-02-14T09:30:00.000Z',
    status: 'ARCHIVED',
    author: { name: 'Priya Patel' },
    folderId: 'folder-3',
    tags: ['legacy', 'pipeline'],
    body: '# Legacy NiFi pipeline guide\n\nKept for historical context only — replaced by OpenFrame Stream Service.',
    attachments: [],
  },
  {
    id: 'article-archived-2',
    type: 'article',
    name: 'Old MeshCentral connector setup',
    description: 'Outdated steps for the original MeshCentral connector. Use the new flow instead.',
    createdAt: '2025-12-18T14:22:00.000Z',
    updatedAt: '2026-03-05T11:10:00.000Z',
    status: 'ARCHIVED',
    author: { name: 'Sam Chen' },
    folderId: 'folder-2-2',
    tags: ['legacy'],
    body: '# Old MeshCentral connector setup\n\nDeprecated — see the current MeshCentral integration guide.',
    attachments: [],
  },
];

export const mockKnowledgeBaseTags: string[] = [
  'onboarding',
  'devices',
  'sso',
  'auth',
  'scripts',
  'automation',
  'troubleshooting',
  'agents',
  'monitoring',
  'security',
];
