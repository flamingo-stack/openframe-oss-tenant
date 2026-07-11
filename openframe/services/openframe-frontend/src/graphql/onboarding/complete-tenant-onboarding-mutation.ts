import { graphql } from 'react-relay';

export const completeTenantOnboardingMutation = graphql`
  mutation completeTenantOnboardingMutation {
    completeTenantOnboarding {
      completedSteps
      completed
      completedAt
    }
  }
`;
