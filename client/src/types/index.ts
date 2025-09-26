export interface ChatMessage {
  id: string
  text: string
  timestamp: Date
  type: 'user' | 'system'
}

export interface ButtonVariant {
  variant: 'primary' | 'secondary' | 'danger'
}

export interface StatusType {
  status: 'online' | 'offline' | 'connecting'
}

export interface AppConfig {
  theme: 'light' | 'dark'
  notifications: boolean
  autoStart: boolean
}
