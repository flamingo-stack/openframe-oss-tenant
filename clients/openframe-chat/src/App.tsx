import './styles/globals.css'
import { ChatView } from './views/ChatView'
import { DebugModeProvider } from './contexts/DebugModeContext'

function App() {
  return (
    <DebugModeProvider>
      <ChatView />
    </DebugModeProvider>
  )
}

export default App