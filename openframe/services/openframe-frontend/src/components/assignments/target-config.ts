import {
  FileContentIcon,
  IdCardIcon,
  MonitorIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ComponentType, SVGProps } from 'react';
import type { AssignmentTargetType } from './types';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  className?: string;
  size?: number;
  color?: string;
}

export interface TargetMeta {
  rowLabel: string;
  menuLabel: string;
  tabLabel: string;
  icon: ComponentType<IconProps>;
}

export const TARGET_CONFIG: Record<AssignmentTargetType, TargetMeta> = {
  ORGANIZATION: {
    rowLabel: 'Assigned Organizations',
    menuLabel: 'Organization',
    tabLabel: 'Organizations',
    icon: IdCardIcon,
  },
  DEVICE: { rowLabel: 'Assigned Devices', menuLabel: 'Device', tabLabel: 'Devices', icon: MonitorIcon },
  TICKET: { rowLabel: 'Assigned Tickets', menuLabel: 'Ticket', tabLabel: 'Tickets', icon: TagIcon },
  KNOWLEDGE_ARTICLE: {
    rowLabel: 'Assigned Knowledge Articles',
    menuLabel: 'Knowledge Article',
    tabLabel: 'Knowledge Articles',
    icon: FileContentIcon,
  },
};
