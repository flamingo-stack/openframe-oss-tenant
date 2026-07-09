import { graphql } from 'react-relay';

export const skipUserOnboardingMutation = graphql`
  mutation skipUserOnboardingMutation {
    skipUserOnboarding {
      completedSteps
      completed
      completedAt
      skipped
      skippedAt
    }
  }
`;
