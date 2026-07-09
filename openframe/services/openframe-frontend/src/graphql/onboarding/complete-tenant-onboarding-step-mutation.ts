import { graphql } from 'react-relay';

export const completeTenantOnboardingStepMutation = graphql`
  mutation completeTenantOnboardingStepMutation($step: TenantOnboardingStep!) {
    completeTenantOnboardingStep(step: $step) {
      completedSteps
      completed
      completedAt
    }
  }
`;
