import { graphql } from 'react-relay';

export const completeUserOnboardingStepMutation = graphql`
  mutation completeUserOnboardingStepMutation($step: UserOnboardingStep!) {
    completeUserOnboardingStep(step: $step) {
      completedSteps
      completed
      completedAt
      skipped
      skippedAt
    }
  }
`;
