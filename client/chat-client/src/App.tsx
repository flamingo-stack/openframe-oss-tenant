import './styles/globals.css'
import { ChatView } from './views/ChatView'
import { useToken } from './hooks/useToken'
import { useEffect } from 'react'

function App() {
  const token = useToken()
  
  // Show alert when token is received (for testing)
  useEffect(() => {
    if (token) {
      console.log('🔐 [APP] Token available in React:', token.substring(0, 10) + '...')
      
      // Show alert with full token for testing
      alert(`✅ Token received from Rust!\n\n${token}`);
      console.log('📋 Full token:', token);
    } else {
      console.log('⏳ [APP] Waiting for token from Rust...')
    }
  }, [token])
  
  return <ChatView />
}

export default App