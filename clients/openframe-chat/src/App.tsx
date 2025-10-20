import './styles/globals.css'
import { ChatView } from './views/ChatView'
import { useToken } from './hooks/useToken'
import { useEffect } from 'react'

function App() {
  const token = useToken()
  
  useEffect(() => {
    if (token) {
      console.log('[APP] Token received from Rust:', token.substring(0, 10) + '...')
    } else {
      console.log('[APP] Waiting for token from Rust...')
    }
  }, [token])
  
  return <ChatView />
}

export default App