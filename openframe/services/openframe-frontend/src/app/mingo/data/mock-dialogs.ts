import { Dialog } from '../types/dialog.types'

export const mockCurrentDialogs: Dialog[] = [
  {
    id: 'current-1',
    topic: 'Critical Security Alert',
    source: 'Security Team',
    slaCountdown: '02:45:30',
    status: 'TECH_REQUIRED',
    createdAt: '2024-01-18T11:15:00Z',
    updatedAt: '2024-01-18T11:15:00Z',
    archived: false
  },
  {
    id: 'current-2',
    topic: 'Performance Degradation',
    source: 'Monitoring System',
    slaCountdown: '06:22:15',
    status: 'ACTIVE',
    createdAt: '2024-01-18T09:30:00Z',
    updatedAt: '2024-01-18T12:45:00Z',
    archived: false
  },
  {
    id: 'current-3',
    topic: 'User Access Issue',
    source: 'Help Desk',
    slaCountdown: '12:30:00',
    status: 'ON_HOLD',
    createdAt: '2024-01-17T16:20:00Z',
    updatedAt: '2024-01-18T08:15:00Z',
    archived: false
  },
  {
    id: 'current-4',
    topic: 'Backup Verification Needed',
    source: 'Operations Team',
    slaCountdown: '04:15:45',
    status: 'ACTIVE',
    createdAt: '2024-01-18T07:00:00Z',
    updatedAt: '2024-01-18T10:30:00Z',
    archived: false
  },
  {
    id: 'current-5',
    topic: 'Database Connection Timeout',
    source: 'Database Team',
    slaCountdown: '08:45:12',
    status: 'TECH_REQUIRED',
    createdAt: '2024-01-17T14:30:00Z',
    updatedAt: '2024-01-18T09:15:00Z',
    archived: false
  }
]

export const mockArchivedDialogs: Dialog[] = [
  {
    id: 'archived-1',
    topic: 'Server Maintenance Complete',
    source: 'Infrastructure Team',
    slaCountdown: 'N/A',
    status: 'RESOLVED',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:45:00Z',
    archived: true
  },
  {
    id: 'archived-2', 
    topic: 'Network Issue Investigation',
    source: 'NOC Team',
    slaCountdown: 'N/A',
    status: 'RESOLVED',
    createdAt: '2024-01-12T08:15:00Z',
    updatedAt: '2024-01-12T16:30:00Z',
    archived: true
  },
  {
    id: 'archived-3',
    topic: 'Database Backup Failure',
    source: 'Database Team',
    slaCountdown: 'N/A', 
    status: 'RESOLVED',
    createdAt: '2024-01-10T22:00:00Z',
    updatedAt: '2024-01-11T09:15:00Z',
    archived: true
  },
  {
    id: 'archived-4',
    topic: 'SSL Certificate Renewal',
    source: 'Security Team',
    slaCountdown: 'N/A',
    status: 'RESOLVED',
    createdAt: '2024-01-08T16:00:00Z',
    updatedAt: '2024-01-09T10:30:00Z',
    archived: true
  },
  {
    id: 'archived-5',
    topic: 'Load Balancer Configuration',
    source: 'Infrastructure Team',
    slaCountdown: 'N/A',
    status: 'RESOLVED',
    createdAt: '2024-01-05T12:15:00Z',
    updatedAt: '2024-01-06T15:45:00Z',
    archived: true
  }
]

export function getMockDialogs(archived: boolean, searchTerm?: string): Dialog[] {
  const dialogs = archived ? mockArchivedDialogs : mockCurrentDialogs
  
  if (!searchTerm) {
    return dialogs
  }
  
  return dialogs.filter(dialog => 
    dialog.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dialog.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dialog.status.toLowerCase().includes(searchTerm.toLowerCase())
  )
}