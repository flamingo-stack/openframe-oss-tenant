/**
 * Onboarding state storage utilities
 * Simple localStorage wrapper following announcement-storage.ts pattern
 * Provides atomic writes to prevent race conditions
 */

export interface OnboardingState {
  completedSteps: string[]
  skippedSteps: string[]
  dismissed: boolean
  lastUpdated: string
}

const DEFAULT_STATE: OnboardingState = {
  completedSteps: [],
  skippedSteps: [],
  dismissed: false,
  lastUpdated: new Date().toISOString()
}

/**
 * Save onboarding state to localStorage (atomic write)
 */
export function saveOnboardingState(key: string, state: OnboardingState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(state))
    console.log('💾 Saved onboarding state:', state)

    // Dispatch custom event for cross-tab sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('localStorageUpdate', {
          detail: { key, newValue: JSON.stringify(state) }
        })
      )
    }
  } catch (err) {
    console.warn('[onboarding-storage] Failed saving to localStorage:', err)
  }
}

/**
 * Load onboarding state from localStorage
 */
export function loadOnboardingState(key: string): OnboardingState {
  if (typeof window === 'undefined') return DEFAULT_STATE

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return DEFAULT_STATE

    const parsed = JSON.parse(raw) as OnboardingState
    return parsed
  } catch (err) {
    console.warn('[onboarding-storage] Failed parsing localStorage data:', err)
    return DEFAULT_STATE
  }
}

/**
 * Mark multiple steps as complete in a single atomic update
 */
export function markMultipleComplete(
  key: string,
  stepIds: string[]
): OnboardingState {
  const state = loadOnboardingState(key)
  const newState: OnboardingState = {
    ...state,
    completedSteps: [...new Set([...state.completedSteps, ...stepIds])],
    skippedSteps: state.skippedSteps.filter(id => !stepIds.includes(id)),
    lastUpdated: new Date().toISOString()
  }
  saveOnboardingState(key, newState)
  return newState
}

/**
 * Mark a single step as complete
 */
export function markStepComplete(key: string, stepId: string): OnboardingState {
  return markMultipleComplete(key, [stepId])
}

/**
 * Mark a step as skipped
 */
export function markStepSkipped(key: string, stepId: string): OnboardingState {
  const state = loadOnboardingState(key)
  const newState: OnboardingState = {
    ...state,
    skippedSteps: [...new Set([...state.skippedSteps, stepId])],
    completedSteps: state.completedSteps.filter(id => id !== stepId),
    lastUpdated: new Date().toISOString()
  }
  saveOnboardingState(key, newState)
  return newState
}

/**
 * Dismiss the onboarding walkthrough
 */
export function dismissOnboarding(key: string): OnboardingState {
  const state = loadOnboardingState(key)
  const newState: OnboardingState = {
    ...state,
    dismissed: true,
    lastUpdated: new Date().toISOString()
  }
  saveOnboardingState(key, newState)
  return newState
}

/**
 * Check if a step is complete
 */
export function isStepComplete(key: string, stepId: string): boolean {
  const state = loadOnboardingState(key)
  return state.completedSteps.includes(stepId)
}

/**
 * Check if a step is skipped
 */
export function isStepSkipped(key: string, stepId: string): boolean {
  const state = loadOnboardingState(key)
  return state.skippedSteps.includes(stepId)
}

/**
 * Check if onboarding is dismissed
 */
export function isOnboardingDismissed(key: string): boolean {
  const state = loadOnboardingState(key)
  return state.dismissed
}
