import type { DialogVersion } from '../hooks/use-dialog-version';
import type { DialogService } from './dialog-service.types';
import { DialogServiceV1 } from './dialog-service-v1';
import { DialogServiceV2 } from './dialog-service-v2';

const serviceInstances: Partial<Record<DialogVersion, DialogService>> = {};

export function getDialogService(version: DialogVersion): DialogService {
  if (!serviceInstances[version]) {
    switch (version) {
      case 'v2':
        serviceInstances[version] = new DialogServiceV2();
        break;
      case 'v1':
      default:
        serviceInstances[version] = new DialogServiceV1();
        break;
    }
  }

  return serviceInstances[version]!;
}

export type {
  DialogService,
  DialogsPage,
  FetchDialogsParams,
  FetchMessagesParams,
  MessagePage,
} from './dialog-service.types';
