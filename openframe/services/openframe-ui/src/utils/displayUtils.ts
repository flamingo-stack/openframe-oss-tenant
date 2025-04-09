import type { IntegratedTool } from '../types/IntegratedTool';

export const getDisplayName = (tool: IntegratedTool): string => {
  const name = tool.name;
  // Remove OpenFrame prefix
  if (name.startsWith('OpenFrame ')) {
    return name.substring(9);
  }
  // Remove suffixes for databases
  if (name.endsWith(' Database') || name.endsWith(' Cache')) {
    return name.split(' ').slice(0, -1).join(' ');
  }
  // Clean up other names
  return name
    .replace(' Message Broker', '')
    .replace(' Coordinator', '')
    .replace(' Controller', '')
    .replace(' Broker', '')
    .replace(' Server', '')
    .replace(' Primary', '')
    .replace('Integrated Tools ', '')
    .replace(' MDM', '')
    .replace(' SSO', '');
}; 