import { useState } from 'react'
import './styles/global.css'

function App() {
  const [message, setMessage] = useState("Hi, I'm chat")
  const [clickCount, setClickCount] = useState(0)

  const messages = [
    "Hi, I'm chat",
    "Hello from OpenFrame! 👋",
    "Ready to assist you! 🚀",
    "What can I help you with? 💬",
    "OpenFrame at your service! ⚡",
    "Cross-platform desktop app! 💻",
    "Built with Rust + Tauri + React! 🦀⚛️",
    "System tray integration! 📱"
  ]

  const handleClick = () => {
    const newCount = clickCount + 1
    setClickCount(newCount)
    const newMessage = messages[newCount % messages.length]
    setMessage(newMessage)
  }

  return (
    <div className="app">
      <div className="chat-container fade-in">
        <header className="chat-header">
          <h1 className="chat-title">OpenFrame</h1>
        </header>
        
        <main className="chat-content">
          <div className="chat-message">
            <span className="status-indicator"></span>
            <span className="message-text">{message}</span>
          </div>
          
          <div className="chat-actions">
            <button 
              className="chat-button"
              onClick={handleClick}
            >
              Say Hello
            </button>
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
    </div>
  )
}

export default App