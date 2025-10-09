import './styles/globals.css'
import { ChatView } from './views/ChatView'
import { useToken } from './hooks/useToken'
import { useEffect } from 'react'

function App() {
  const token = useToken()
  
  useEffect(() => {
    if (token) {
      console.log('✅ [APP] Token received from Rust:', token.substring(0, 10) + '...')
    } else {
      console.log('⏳ [APP] Waiting for token from Rust...')
    }
  }, [token])
  
  return (
    <>
      {/* Token banner - always visible when token is available */}
      {token && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#2563eb',
          color: 'white',
          padding: '8px 16px',
          zIndex: 9999,
          fontSize: '11px',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>🔑 TOKEN:</span>
          <span style={{ 
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {token}
          </span>
        </div>
      )}
      
      {/* Add padding to ChatView to account for token banner */}
      <div style={{ paddingTop: token ? '32px' : '0' }}>
        <ChatView />
      </div>
    </>
  )
}

export default App