import { useState, useEffect } from 'react'
import { Button } from './Button'
import { StatusIndicator } from './StatusIndicator'
import { useChatMessages } from '../hooks/useChatMessages'
import './Chat.css'

export function Chat() {
  const [isAnimated, setIsAnimated] = useState(false)
  const { currentMessage, nextMessage, clickCount } = useChatMessages()

  useEffect(() => {
    setIsAnimated(true)
  }, [])

  return (
    <div className={`chat-container ${isAnimated ? 'fade-in' : ''}`}>
      <header className="chat-header">
        <h1 className="chat-title">OpenFrame</h1>
      </header>
      
      <main className="chat-content">
        <div className="chat-message">
          <StatusIndicator status="online" />
          <span className="message-text">{currentMessage}</span>
        </div>
        
        <div className="chat-actions">
          <Button 
            onClick={nextMessage}
            variant="primary"
            size="medium"
          >
            Say Hello
          </Button>
        </div>
      </main>
      
      <footer className="chat-footer">
        <div className="chat-info">
          <span>Desktop App • Cross Platform • Tauri + React</span>
          <div className="click-counter">
            Clicks: {clickCount}
          </div>
        </div>
      </footer>
    </div>
  )
}
