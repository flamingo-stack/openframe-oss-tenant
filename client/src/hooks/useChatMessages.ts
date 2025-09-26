import { useState, useCallback } from 'react'

const MESSAGES = [
  "Hi, I'm chat",
  "Hello from OpenFrame! 👋",
  "Ready to assist you! 🚀",
  "What can I help you with? 💬",
  "OpenFrame at your service! ⚡",
  "Cross-platform desktop app! 💻",
  "Built with Rust + Tauri + React! 🦀⚛️",
  "System tray integration! 📱",
  "Modern React components! ⚛️",
  "TypeScript for type safety! 📝"
] as const

export function useChatMessages() {
  const [clickCount, setClickCount] = useState(0)
  const [currentMessage, setCurrentMessage] = useState<string>(MESSAGES[0])

  const nextMessage = useCallback(() => {
    setClickCount(prev => {
      const newCount = prev + 1
      const messageIndex = newCount % MESSAGES.length
      setCurrentMessage(MESSAGES[messageIndex])
      return newCount
    })
  }, [])

  const resetMessages = useCallback(() => {
    setClickCount(0)
    setCurrentMessage(MESSAGES[0])
  }, [])

  return {
    currentMessage,
    clickCount,
    nextMessage,
    resetMessages,
    totalMessages: MESSAGES.length
  }
}
