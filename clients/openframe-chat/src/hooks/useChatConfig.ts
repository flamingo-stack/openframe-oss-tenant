import { useState, useEffect } from 'react'
import quickActionsData from '../config/quickActions.json'

export interface QuickAction {
  id: string
  text: string
}

export function useChatConfig() {
  const [quickActions, setQuickActions] = useState<QuickAction[]>([])
  
  useEffect(() => {
    // Load quick actions from config
    // In a real app, this could be fetched from an API or local storage
    setQuickActions(quickActionsData.actions)
  }, [])
  
  const updateQuickActions = (actions: QuickAction[]) => {
    setQuickActions(actions)
    // In a real app, you might want to persist this to local storage
  }
  
  return {
    quickActions,
    updateQuickActions
  }
}