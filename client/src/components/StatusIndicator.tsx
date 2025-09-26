import './StatusIndicator.css'

interface StatusIndicatorProps {
  status?: 'online' | 'offline' | 'connecting'
  size?: 'small' | 'medium' | 'large'
}

export function StatusIndicator({ status = 'online', size = 'medium' }: StatusIndicatorProps) {
  const statusColors = {
    online: '#4CAF50',
    offline: '#f44336',
    connecting: '#ff9800'
  }

  const sizes = {
    small: '8px',
    medium: '12px', 
    large: '16px'
  }

  return (
    <span 
      className={`status-indicator status-indicator--${status} status-indicator--${size}`}
      style={{
        '--status-color': statusColors[status],
        '--status-size': sizes[size]
      } as React.CSSProperties}
    />
  )
}
