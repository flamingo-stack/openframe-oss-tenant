import type { IntegratedTool } from '../types/IntegratedTool';

// Define the category order that matches the system architecture
export const CATEGORY_ORDER = [
  'Interface',
  'Application',
  'Configuration',
  'Streaming',
  'Data Integration',
  'Datasource',
  'Integrated Tools',
  'Integrated Tools Datasource',
  'Monitoring'
] as const;

export type Category = typeof CATEGORY_ORDER[number];

// Map tool types to their categories
const TOOL_TYPE_TO_CATEGORY: Record<string, Category> = {
  'MONGODB': 'Datasource',
  'REDIS': 'Datasource',
  'CASSANDRA': 'Datasource',
  'MYSQL': 'Integrated Tools Datasource',
  'POSTGRESQL': 'Integrated Tools Datasource',
  'KAFKA': 'Streaming',
  'NIFI': 'Data Integration',
  'PINOT': 'Data Integration',
  'PROMETHEUS': 'Monitoring',
  'GRAFANA': 'Monitoring',
  'LOKI': 'Monitoring',
  'FLEET': 'Integrated Tools',
  'AUTHENTIK': 'Integrated Tools',
  'OPENFRAME_UI': 'Interface',
  'OPENFRAME_API': 'Application',
  'OPENFRAME_GATEWAY': 'Application',
  'OPENFRAME_CONFIG': 'Configuration',
  'OPENFRAME_STREAM': 'Streaming',
  'OPENFRAME_MANAGEMENT': 'Application'
};

// Get the category for a tool based on its type and other properties
export const getToolCategory = (tool: IntegratedTool): Category => {
  // First check if the tool has an explicit layer
  if (tool.layer && CATEGORY_ORDER.includes(tool.layer as Category)) {
    return tool.layer as Category;
  }

  // Then check if the tool has an explicit category
  if (tool.category && CATEGORY_ORDER.includes(tool.category as Category)) {
    return tool.category as Category;
  }

  // Then check if we can determine the category from the tool type
  if (tool.type && TOOL_TYPE_TO_CATEGORY[tool.type]) {
    return TOOL_TYPE_TO_CATEGORY[tool.type];
  }

  // Finally, use platformCategory if available, otherwise default to 'Application'
  return (tool.platformCategory as Category) || 'Application';
};

// Get the display class for a category
export const getCategoryClass = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'Interface': 'interface',
    'Application': 'application',
    'Configuration': 'config',
    'Streaming': 'streaming',
    'Data Integration': 'integration',
    'Datasource': 'datasource',
    'Integrated Tools': 'integrated-tools',
    'Integrated Tools Datasource': 'integrated-tools-datasource',
    'Monitoring': 'monitoring'
  };
  return categoryMap[category] || '';
};

// Sort tools by their category order
export const sortToolsByCategory = (tools: IntegratedTool[]): Record<string, IntegratedTool[]> => {
  const grouped: Record<string, IntegratedTool[]> = {};
  
  // Initialize all categories
  CATEGORY_ORDER.forEach(category => {
    grouped[category] = [];
  });

  // Group tools by their categories
  tools.forEach(tool => {
    const category = getToolCategory(tool);
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(tool);
  });

  // Create a new object with only non-empty categories in the correct order
  const orderedGroups: Record<string, IntegratedTool[]> = {};
  CATEGORY_ORDER.forEach(category => {
    if (grouped[category].length > 0) {
      orderedGroups[category] = grouped[category];
    }
  });

  return orderedGroups;
}; 