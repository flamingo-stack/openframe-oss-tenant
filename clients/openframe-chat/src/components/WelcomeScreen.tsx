import { Button, FeatureList } from '@flamingo-stack/openframe-frontend-core/components/ui';
import {
  WrenchScrewdiverIcon,
  BrainAIIcon,
  ClockCheckIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { FlamingoLogo } from '@flamingo-stack/openframe-frontend-core/components/icons';
import faeAvatar from '../assets/fae-avatar.png';

const ICON_COLOR = 'var(--ods-flamingo-pink-base)';

const features = [
  {
    icon: <WrenchScrewdiverIcon size={24} color={ICON_COLOR} />,
    title: 'Try to Fix It Instantly',
    description:
      'Fae diagnoses common issues like email problems, password resets, slow performance, or connectivity — and resolves them on the spot.',
  },
  {
    icon: <BrainAIIcon size={24} color={ICON_COLOR} />,
    title: 'Escalate When Needed',
    description:
      "If the issue needs hands-on attention, Fae automatically creates a detailed support ticket so your technician knows exactly what's going on.",
  },
  {
    icon: <ClockCheckIcon size={24} color={ICON_COLOR} />,
    title: '24/7 — No Waiting',
    description:
      'Ask anything, anytime. No hold music, no queue — just immediate help or a fast handoff to the right person.',
  },
];

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="h-screen flex flex-col items-center bg-ods-bg">
      <div className="flex flex-col gap-6 items-center justify-center flex-1 w-full max-w-[600px] px-4">
        <img
          src={faeAvatar}
          alt="Fae"
          className="size-16 rounded-full object-cover"
        />

        <p className="text-h3 text-ods-text-primary text-center max-w-[504px]">
          Meet Fae, your AI IT assistant. She fixes what she can right away — and
          hands off the rest to your technicians.
        </p>

        <FeatureList items={features} className="w-full" />

        <Button variant="flamingo-primary" size="default" onClick={onGetStarted}>
          Get Started
        </Button>
      </div>

      <div className="flex gap-2 items-center justify-center pb-6">
        <span className="text-h6 text-ods-text-secondary normal-case tracking-normal">
          Powered by
        </span>
        <FlamingoLogo className="h-5 w-5" fill="var(--color-text-secondary)" />
        <span className="font-heading text-sm text-ods-text-secondary">
          Flamingo
        </span>
      </div>
    </div>
  );
}
