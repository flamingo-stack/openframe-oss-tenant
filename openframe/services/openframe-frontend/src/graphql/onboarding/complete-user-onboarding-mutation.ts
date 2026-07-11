import { graphql } from 'react-relay';

export const completeUserOnboardingMutation = graphql`
  mutation completeUserOnboardingMutation {
    completeUserOnboarding {
      completedSteps
      completed
      completedAt
      skipped
      skippedAt
    }
  }
`;
