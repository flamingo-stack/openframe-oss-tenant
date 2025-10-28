import './styles/globals.css'
import { ChatView } from './views/ChatView'
import { DebugModeProvider } from './contexts/DebugModeContext'
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    const appType = (import.meta.env.NEXT_PUBLIC_APP_TYPE as string) || 'flamingo'
    document.documentElement.setAttribute('data-app-type', appType)
  }, [])

  return (
    <DebugModeProvider>
      <ChatView />
    </DebugModeProvider>
  )
}

export default App