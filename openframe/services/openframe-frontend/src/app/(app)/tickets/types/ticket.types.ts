// Ticket system types matching the backend GraphQL schema (openframe-saas-ai-agent)

export type TicketStatus = 'ACTIVE' | 'TECH_REQUIRED' | 'ON_HOLD' | 'RESOLVED' | 'ARCHIVED';

export interface TicketOwner {
  type: 'CLIENT' | 'ADMIN';
  machineId?: string;
  userId?: string;
}

export interface TicketUserInfo {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TicketImage {
  imageUrl: string;
  sourceType: string;
  hash?: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  uploader?: TicketUserInfo;
}

export interface TempAttachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadUrl: string;
  createdAt: string;
}

export interface TicketNote {
  id: string;
  ticketId: string;
  content: string;
  authorId: string;
  author?: TicketUserInfo;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description?: string;
  status: TicketStatus;
  creationSource?: string;
  owner: TicketOwner;
  deviceId?: string;
  deviceHostname?: string;
  organizationId?: string;
  organizationName?: string;
  reporterId?: string;
  reporterName?: string;
  assignedTo?: string;
  assignedName?: string;
  assignee?: TicketUserInfo;
  assigneeImage?: TicketImage;
  reporterImage?: TicketImage;
  organizationImage?: TicketImage;
  labels: Array<{ id: string; key: string; color?: string }>;
  attachments: TicketAttachment[];
  notes: TicketNote[];
  linkedArticles?: KnowledgeBaseArticle[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// GraphQL payload types
export interface UserError {
  field?: string[];
  message: string;
}

export interface TicketPayload {
  ticket: Ticket | null;
  userErrors: UserError[];
}

export interface TempAttachmentPayload {
  tempAttachment: TempAttachment | null;
  userErrors: UserError[];
}

export interface TicketAttachmentUploadPayload {
  attachment: TicketAttachment | null;
  uploadUrl: string | null;
  userErrors: UserError[];
}

export interface DeletePayload {
  userErrors: UserError[];
}

// Mutation input types
export interface CreateTicketInput {
  title: string;
  description?: string;
  deviceId?: string;
  organizationId?: string;
  assigneeId?: string;
  labelIds?: string[];
  linkedArticleIds?: string[];
  tempAttachmentIds?: string[];
}

export interface UpdateTicketInput {
  id: string;
  title?: string;
  description?: string;
  deviceId?: string | null;
  organizationId?: string | null;
  assigneeId?: string | null;
  labelIds?: string[];
  tempAttachmentIds?: string[];
}

export interface AssignTicketInput {
  id: string;
  assigneeId: string;
}

export interface TicketIdInput {
  id: string;
}
