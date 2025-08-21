import OpenFrameAuthPage from '@/components/openframe/auth/auth-page'

/**
 * Main auth page entry point
 * Uses the new component structure following multi-platform-hub pattern
 * 
 * Features:
 * - Sub-components for each auth step (AuthChoiceSection, AuthSignupSection, AuthLoginSection)
 * - Shared AuthBenefitsSection across all screens
 * - URL routing with proper browser history (/auth, /auth/signup, /auth/login)
 * - Navigation utilities for consistent router usage
 * - Reusable component structure following multi-platform-hub patterns
 */
export default function AuthPage() {
  return <OpenFrameAuthPage />
}