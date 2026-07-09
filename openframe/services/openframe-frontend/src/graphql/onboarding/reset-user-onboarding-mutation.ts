import { graphql } from 'react-relay';

export const resetUserOnboardingMutation = graphql`
  mutation resetUserOnboardingMutation {
    resetUserOnboarding {
      completedSteps
      completed
      completedAt
      skipped
      skippedAt
    }
  }
`;
