export interface DialogMessage {
  id: string
  sender: 'user' | 'technician' | 'fae'
  senderName: string
  content: string
  timestamp: string
  type?: 'text' | 'system'
}

export interface DialogDetails {
  id: string
  topic: string
  source: string
  slaCountdown: string
  status: 'TECH_REQUIRED' | 'ON_HOLD' | 'ACTIVE' | 'RESOLVED'
  createdAt: string
  updatedAt: string
  organization: {
    id: string
    name: string
    type: string
  }
  device: {
    id: string
    name: string
    type: 'device'
  }
  clientMessages: DialogMessage[]
  technicianMessages: DialogMessage[]
  isFaePaused: boolean
}

export const mockDialogDetails: DialogDetails = {
  id: 'dialog-001',
  topic: 'Email client synchronization issues',
  source: 'Email Support',
  slaCountdown: '01:23:45',
  status: 'ACTIVE',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-10T14:47:00Z',
  organization: {
    id: 'org-001',
    name: 'PrintManage Pro',
    type: 'Organization ID (Site)'
  },
  device: {
    id: 'device-001',
    name: 'TB-156-SEA',
    type: 'device'
  },
  clientMessages: [
    {
      id: 'msg-001',
      sender: 'user',
      senderName: 'Roman Smith',
      content: 'My computer is slow',
      timestamp: '2:47 PM',
      type: 'text'
    },
    {
      id: 'msg-002',
      sender: 'fae',
      senderName: 'Fae',
      content: 'Let me gather some information about your device',
      timestamp: '2:47 PM',
      type: 'text'
    }
  ],
  technicianMessages: [],
  isFaePaused: false
}

export const mockDialogs = [
  {
    id: 'dialog-001',
    topic: 'Email client synchronization issues',
    source: 'Email Support',
    slaCountdown: '01:23:45',
    status: 'ACTIVE' as const,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T14:47:00Z',
    archived: false
  },
  {
    id: 'dialog-002',
    topic: 'Network connectivity problems',
    source: 'Network Team',
    slaCountdown: '03:15:22',
    status: 'ON_HOLD' as const,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T13:00:00Z',
    archived: false
  },
  {
    id: 'dialog-003',
    topic: 'Software installation request',
    source: 'IT Helpdesk',
    slaCountdown: '00:45:10',
    status: 'TECH_REQUIRED' as const,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-10T12:00:00Z',
    archived: false
  }
]