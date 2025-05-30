<template>
  <div class="architecture-container">
    <div class="architecture-diagram">
      <VueFlow
        v-model="elements"
        :default-viewport="{ x: 0, y: 0, zoom: 0.5 }"
        :fit-view-on-init="true"
        :min-zoom="0.2"
        :max-zoom="2"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :pan-on-drag="true"
        :zoom-on-scroll="true"
        :zoom-on-pinch="true"
        :zoom-on-double-click="true"
        @nodeClick="onNodeClick"
        class="diagram"
      >
        <template #node-default="nodeProps">
          <div class="node-content">
            <div class="node-label">{{ nodeProps.data.label }}</div>
            <img 
              :src="nodeProps.data.logo" 
              :alt="nodeProps.data.label"
              class="node-logo"
              @error="onLogoError"
            />
          </div>
        </template>
        <Background :gap="20" :color="isDark ? '#555' : '#aaa'" />
        <Controls />
        <Panel position="top-left" class="title-panel">
          <div class="brand">
            <div class="brand-name">
              <span class="brand-title">Open<span class="brand-highlight">Frame</span></span>
              <span class="brand-section">Architecture</span>
            </div>
          </div>
        </Panel>
        <Panel position="top-right" class="legend">
          <div class="legend-content">
            <div class="legend-section">
              <div class="legend-item" v-for="(color, type) in nodeTypes" :key="type">
                <div class="legend-color" :style="{ backgroundColor: color }"></div>
                <span>{{ type }}</span>
              </div>
            </div>
            <div class="legend-separator"></div>
            <div class="legend-section">
              <div class="legend-item">
                <div class="legend-line traffic-line"></div>
                <span>Traffic Flow</span>
              </div>
              <div class="legend-item">
                <div class="legend-line data-line"></div>
                <span>Data Flow</span>
              </div>
            </div>
          </div>
        </Panel>
      </VueFlow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { VueFlow, Panel, useVueFlow } from '@vue-flow/core'
import type { NodeMouseEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { Edge, Node } from '@vue-flow/core'
import { useThemeStore } from '@/stores/themeStore'
import { storeToRefs } from 'pinia'
import { getLogoUrl } from '@/services/LogoService'
import { useQuery, provideApolloClient } from '@vue/apollo-composable'
import { apolloClient } from '../apollo/apolloClient'
import gql from 'graphql-tag'
import type { IntegratedTool } from '../types/graphql'
import { getDisplayName } from '../utils/displayUtils'
import { useRouter } from 'vue-router'
import openframeLogoWhite from '@/assets/openframe-logo-white.svg'
import openframeLogoBlack from '@/assets/openframe-logo-black.svg'
import authentikLogo from '@/assets/authentik-logo.svg'
import fleetLogo from '@/assets/fleet-logo.svg'
import rustdeskLogo from '@/assets/rustdesk-logo.svg'
import grafanaLogo from '@/assets/grafana-logo.svg'
import lokiLogo from '@/assets/loki-logo.svg'
import prometheusLogo from '@/assets/prometheus-logo.svg'
import kafkaLogo from '@/assets/kafka-logo.svg'
import mongoExpressLogo from '@/assets/mongo-express-logo.svg'
import mongodbLogo from '@/assets/mongodb-logo.svg'
import nifiLogo from '@/assets/nifi-logo.svg'
import pinotLogo from '@/assets/pinot-logo.svg'
import kibanaLogo from '@/assets/kibana-logo.svg'
import redisLogo from '@/assets/redis-logo.svg'
import cassandraLogo from '@/assets/cassandra-logo.svg'
import zookeeperLogo from '@/assets/zookeeper-logo.svg'
import meshcentralLogo from '@/assets/meshcentral-logo.svg'
import tacticalRmmLogo from '@/assets/tactical-rmm-logo.svg'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

// Provide Apollo client
provideApolloClient(apolloClient)

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const elements = ref<Array<Node | Edge>>([])

// Node type colors - using OpenFrame UI theme colors
const nodeTypes = {
  'Interface': 'var(--yellow-500)',                    // Yellow for UI
  'Application': 'var(--bluegray-700)',                // Dark Blue-Gray for core apps
  'Configuration': 'var(--yellow-600)',                // Darker Yellow for config
  'Streaming': 'var(--blue-600)',                      // Blue for streaming
  'Data Integration': 'var(--blue-800)',               // Dark Blue for integration
  'Datasource': 'var(--gray-700)',                     // Dark Gray for datasources
  'Integrated Tools': 'var(--yellow-400)',             // Light Yellow for tools
  'Integrated Tools Datasource': 'var(--gray-500)',    // Light Gray for integrated tools databases
  'Monitoring': 'var(--bluegray-500)'                  // Medium Blue-Gray for monitoring
}

// Helper function to determine node position based on layer and order
const getNodePosition = (tool: IntegratedTool) => {
  const baseX = 50;
  const containerHeight = window.innerHeight - 64; // Account for header
  const baseY = containerHeight / 2; // Center point of the container
  const xSpacing = 450;
  const ySpacing = 160;
  
  let x = baseX;
  let y = baseY;

  // Position based on layer
  switch (tool.layer) {
    case 'Interface':
      x = baseX;
      break;
    case 'Application':
      x = baseX + xSpacing;
      break;
    case 'Configuration':
      x = baseX + (xSpacing * 2);
      break;
    case 'Streaming':
      x = baseX + (xSpacing * 3);
      break;
    case 'Data Integration':
      x = baseX + (xSpacing * 4);
      break;
    case 'Datasource':
      x = baseX + (xSpacing * 5);
      break;
    case 'Integrated Tools':
      x = baseX + (xSpacing * 6);
      break;
    case 'Integrated Tools Datasource':
      x = baseX + (xSpacing * 7);
      break;
    case 'Monitoring':
      x = baseX + (xSpacing * 8);
      break;
  }

  // Count total nodes in this layer to calculate vertical centering
  const totalNodesInLayer = result.value?.integratedTools.filter(
    (t: IntegratedTool) => t.layer === tool.layer && t.enabled
  ).length || 1;

  // Calculate vertical offset to center the group
  if (tool.layerOrder !== undefined && tool.layerOrder !== null) {
    const totalHeight = (totalNodesInLayer - 1) * ySpacing;
    const startY = baseY - (totalHeight / 2);
    y = startY + ((tool.layerOrder - 1) * ySpacing);
  }

  return { x, y };
};

// Helper function to determine node class based on tool category
const getNodeClass = (tool: IntegratedTool) => {
  console.log(`Getting class for tool ${tool.id} with layer ${tool.layer}`);
  switch (tool.layer) {
    case 'Interface':
      return 'interface';
    case 'Application':
      return 'application';
    case 'Configuration':
      return 'config';
    case 'Streaming':
      return 'streaming';
    case 'Data Integration':
      return 'integration';
    case 'Datasource':
      return 'datasource';
    case 'Integrated Tools':
      return 'integrated-tools';
    case 'Integrated Tools Datasource':
      return 'integrated-tools';
    case 'Monitoring':
      return 'monitoring';
    default:
      console.warn(`Unknown layer for tool ${tool.id}: ${tool.layer}`);
      return '';
  }
};

// Helper function to create edges between nodes
const createEdges = (tools: IntegratedTool[]): Edge[] => {
  const edges: Edge[] = [];

  // Define connections based on architecture
  const connections = [
    // Traffic flows (solid lines)
    { from: 'openframe-ui', to: 'openframe-api', type: 'traffic-flow' },
    { from: 'openframe-gateway', to: 'fleet', type: 'traffic-flow' },
    { from: 'openframe-gateway', to: 'authentik', type: 'traffic-flow' },
    { from: 'openframe-gateway', to: 'grafana-primary', type: 'traffic-flow' },
    { from: 'openframe-ui', to: 'openframe-management', type: 'traffic-flow' },
    { from: 'grafana-primary', to: 'prometheus-primary', type: 'data-flow' },
    { from: 'grafana-primary', to: 'loki-primary', type: 'data-flow' },
    
    // Data flows (dashed lines)
    { from: 'openframe-api', to: 'openframe-config', type: 'data-flow' },
    { from: 'openframe-gateway', to: 'openframe-config', type: 'data-flow' },
    { from: 'openframe-stream', to: 'openframe-config', type: 'data-flow' },
    { from: 'openframe-management', to: 'openframe-config', type: 'data-flow' },
    { from: 'openframe-stream', to: 'kafka-primary', type: 'data-flow' },
    { from: 'openframe-api', to: 'kafka-primary', type: 'data-flow' },
    { from: 'openframe-management', to: 'kafka-primary', type: 'data-flow' },
    { from: 'kafka-primary', to: 'zookeeper-primary', type: 'data-flow' },
    { from: 'kafka-primary', to: 'nifi-primary', type: 'data-flow' },
    { from: 'openframe-management', to: 'mongodb-primary', type: 'data-flow' },
    { from: 'openframe-api', to: 'mongodb-primary', type: 'data-flow' },
    { from: 'openframe-stream', to: 'cassandra-primary', type: 'data-flow' },
    { from: 'openframe-stream', to: 'pinot-primary', type: 'data-flow' },
    { from: 'openframe-api', to: 'prometheus-primary', type: 'data-flow' },
    { from: 'openframe-management', to: 'prometheus-primary', type: 'data-flow' },
    { from: 'openframe-stream', to: 'prometheus-primary', type: 'data-flow' },
    { from: 'openframe-gateway', to: 'prometheus-primary', type: 'data-flow' },
    { from: 'openframe-api', to: 'loki-primary', type: 'data-flow' },
    { from: 'openframe-management', to: 'loki-primary', type: 'data-flow' },
    { from: 'openframe-stream', to: 'loki-primary', type: 'data-flow' },
    { from: 'openframe-gateway', to: 'loki-primary', type: 'data-flow' },

    // Integrated tools database connections
    { from: 'fleet', to: 'integrated-tools-mysql', type: 'data-flow' },
    { from: 'fleet', to: 'integrated-tools-redis', type: 'data-flow' },
    { from: 'authentik', to: 'integrated-tools-postgresql', type: 'data-flow' },
    { from: 'authentik', to: 'integrated-tools-redis', type: 'data-flow' }
  ];

  // Create edges only for existing tools
  const toolIds = tools.map(t => t.id);
  connections.forEach(conn => {
    if (toolIds.includes(conn.from) && toolIds.includes(conn.to)) {
      edges.push({
        id: `${conn.from}-${conn.to}`,
        source: conn.from,
        target: conn.to,
        class: conn.type
      });
    }
  });

  return edges;
};

// Helper function to get logo URL based on tool ID and type
const getLogoForTool = (tool: IntegratedTool): string => {
  // First try to match by ID
  switch (tool.id) {
    case 'grafana-primary':
      return grafanaLogo;
    case 'mongodb-primary':
      return mongodbLogo;
    case 'tactical-rmm':
      return tacticalRmmLogo;
    case 'mongo-express':
      return mongoExpressLogo;
    case 'kafka-primary':
      return kafkaLogo;
    case 'kibana':
      return kibanaLogo;
    case 'fleet':
      return fleetLogo;
    case 'authentik':
      return authentikLogo;
    case 'prometheus-primary':
      return prometheusLogo;
    case 'nifi-primary':
      return nifiLogo;
    case 'pinot-primary':
      return pinotLogo;
    case 'loki-primary':
      return lokiLogo;
    case 'redis-primary':
    case 'integrated-tools-redis':
      return redisLogo;
    case 'cassandra-primary':
      return cassandraLogo;
    case 'zookeeper-primary':
      return zookeeperLogo;
    case 'meshcentral':
      return meshcentralLogo;
  }

  // Then try by tool type
  switch (tool.toolType) {
    case 'AUTHENTIK':
      return authentikLogo;
    case 'FLEET':
      return fleetLogo;
    case 'RUSTDESK':
      return rustdeskLogo;
    case 'GRAFANA':
      return grafanaLogo;
    case 'LOKI':
      return lokiLogo;
    case 'PROMETHEUS':
      return prometheusLogo;
    case 'KAFKA':
      return kafkaLogo;
    case 'MONGO_EXPRESS':
      return mongoExpressLogo;
    case 'MONGODB':
      return mongodbLogo;
    case 'NIFI':
      return nifiLogo;
    case 'PINOT':
      return pinotLogo;
    case 'KIBANA':
      return kibanaLogo;
    case 'REDIS':
      return redisLogo;
    case 'CASSANDRA':
      return cassandraLogo;
    case 'ZOOKEEPER':
      return zookeeperLogo;
    case 'MESHCENTRAL':
      return meshcentralLogo;
    case 'TACTICAL_RMM':
      return tacticalRmmLogo;
  }

  // Default to OpenFrame logo
  return isDark.value ? openframeLogoWhite : openframeLogoBlack;
};

// Add error handler for logo loading
const onLogoError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
};

// Reuse the same GraphQL query from Tools.vue
const INTEGRATED_TOOLS_QUERY = gql`
  query GetIntegratedTools($filter: ToolFilter) {
    integratedTools(filter: $filter) {
      id
      name
      description
      icon
      toolUrls {
        url
        port
        type
      }
      type
      toolType
      category
      platformCategory
      enabled
      layer
      layerOrder
      layerColor
    }
  }
`

// Fetch tools data
const { result, loading, error } = useQuery(
  INTEGRATED_TOOLS_QUERY,
  {
    filter: {
      enabled: true
    }
  }
);

// Get router instance
const router = useRouter()

// Handle node click
const onNodeClick = ({ event, node }: NodeMouseEvent) => {
  console.log('Node clicked:', node.id)
  const tool = result.value?.integratedTools.find((t: IntegratedTool) => t.id === node.id)
  if (tool) {
    console.log('Navigating to tool:', tool.name)
    router.push({
      name: 'tools',
      query: { search: tool.name }
    })
  }
}

// Watch for tools data and update chart
watch(result, (newResult) => {
  if (newResult?.integratedTools) {
    const tools = newResult.integratedTools.filter((tool: IntegratedTool) => tool.enabled);
    console.log('Filtered tools:', tools);
    
    // Create nodes from tools
    const nodes: Node[] = tools.map((tool: IntegratedTool) => {
      const position = getNodePosition(tool);
      console.log(`Tool ${tool.id} - Layer: ${tool.layer}, Position:`, position);
      
      return {
        id: tool.id,
        data: { 
          label: getDisplayName(tool), 
          logo: getLogoForTool(tool)
        },
        position,
        class: getNodeClass(tool),
        style: { cursor: 'pointer' }
      };
    });

    // Create edges between nodes based on architecture
    const edges: Edge[] = createEdges(tools);
    console.log('Created edges:', edges);

    elements.value = [...nodes, ...edges];
  }
}, { immediate: true });
</script>

<style scoped>
.architecture-container {
  width: 100%;
  height: calc(100vh - 64px);
  display: flex;
  background: var(--surface-ground);
  overflow: hidden;
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
}

.architecture-diagram {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
}

.diagram {
  width: 100%;
  height: 100%;
  overflow: hidden;  /* Prevent inner scrolling */
}

/* Legend styles */
.legend {
  background: var(--surface-card);
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  font-family: var(--font-family);
  border: 1px solid var(--surface-border);
  margin: 24px;
  padding: 12px 16px;
}

.legend-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 1px 0;
  padding: 2px 4px;
  color: var(--text-color);
  font-size: 12px;
  font-weight: var(--font-weight-normal);
}

.legend-separator {
  height: 1px;
  background: var(--surface-border);
  margin: 4px 0;
  opacity: 0.5;
}

/* Node styles */
:deep(.vue-flow__node) {
  padding: 16px 24px;
  border-radius: 14px;
  width: 400px;
  height: 120px;
  font-size: 28px;
  font-family: var(--font-family);
  font-weight: 600;
  color: white;
  border: 2px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

/* Node content layout */
:deep(.node-content) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  gap: 20px;
}

:deep(.node-label) {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 28px;
  color: white;
}

:deep(.node-logo) {
  height: 90px;
  width: 180px;
  object-fit: contain;
  object-position: right;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

/* Node background colors */
:deep(.vue-flow__node.interface) { 
  background-color: var(--yellow-500);
  .node-label { color: var(--bluegray-900) !important; }
  .node-logo { filter: brightness(0) !important; }
}
:deep(.vue-flow__node.application) { 
  background-color: var(--bluegray-700);
}
:deep(.vue-flow__node.config) { 
  background-color: var(--yellow-600);
}
:deep(.vue-flow__node.streaming) { 
  background-color: var(--blue-600);
}
:deep(.vue-flow__node.integration) { 
  background-color: var(--blue-800);
}
:deep(.vue-flow__node.datasource) { 
  background-color: var(--gray-700);
}
:deep(.vue-flow__node.integrated-tools) { 
  background-color: var(--yellow-400);
  .node-label { color: var(--bluegray-900) !important; }
  .node-logo { filter: brightness(0) !important; }
}
:deep(.vue-flow__node.integrated-tools) { 
  background-color: var(--gray-500);
}
:deep(.vue-flow__node.monitoring) { 
  background-color: var(--bluegray-500);
  .node-label { color: white !important; }
  .node-logo { filter: brightness(0) invert(1) !important; }
}

/* Remove any other overrides */
:deep(.vue-flow__node.integrated-tools .node-logo),
:deep(.vue-flow__node.interface .node-logo),
:deep(.vue-flow__node.monitoring .node-logo) {
  filter: none;
}

/* Update node logo styles - only affect specific nodes */
:deep(.vue-flow__node.integrated-tools .node-logo),
:deep(.vue-flow__node.interface .node-logo) {
  filter: brightness(0) !important;
  opacity: 0.9;
}

:deep(.vue-flow__node.monitoring .node-logo) {
  filter: brightness(0) invert(1) !important;
  opacity: 0.9;
}

/* Legend additions */
.legend-separator {
  height: 1px;
  background: var(--surface-border);
  margin: 12px 0;
  opacity: 0.5;
}

.legend-line {
  width: 20px;
  height: 0;
  margin-right: 4px;
  position: relative;
}

.legend-line.traffic-line {
  border-top: 2px solid var(--bluegray-400);
  opacity: 0.4;
}

.legend-line.data-line {
  border-top: 2px dashed var(--bluegray-400);
  opacity: 0.4;
}

/* Edge styles */
:deep(.vue-flow__edge-path) {
  stroke: var(--bluegray-400);
  stroke-width: 2;
  stroke-opacity: 0.6;
}

:deep(.vue-flow__edge.traffic-flow .vue-flow__edge-path) {
  stroke-width: 2.5;
  stroke-dasharray: none;
}

:deep(.vue-flow__edge.data-flow .vue-flow__edge-path) {
  stroke-width: 2;
  stroke-dasharray: 8, 4;
  animation: flowAnimation 20s linear infinite;
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke-opacity: 0.8;
  stroke-width: 3;
}

@keyframes flowAnimation {
  from { 
    stroke-dashoffset: 24; 
  }
  to { 
    stroke-dashoffset: 0;
  }
}

/* Node hover effects */
:deep(.vue-flow__node:hover) {
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
  transform: scale(1.05);
  z-index: 1000;
}

/* Controls styles */
:deep(.vue-flow__controls) {
  font-family: var(--font-family);
}

/* Handle text overflow in nodes */
:deep(.vue-flow__node) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 10px 18px;
}

/* Make text sharper */
:deep(.vue-flow__node) {
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: auto;
}

/* Legend styles */
.legend-color {
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.2);
}

/* Make legend lines more visible */
.legend-line {
  width: 20px;
  height: 0;
  margin-right: 4px;
  position: relative;
}

.legend-line.traffic-line {
  border-top: 2px solid var(--bluegray-400);
  opacity: 0.6;
}

.legend-line.data-line {
  border-top: 2px dashed var(--bluegray-400);
  opacity: 0.6;
}

/* Update node logo styles */
:deep(.vue-flow__node.integrated-tools .node-logo),
:deep(.vue-flow__node.interface .node-logo),
:deep(.vue-flow__node.monitoring .node-logo) {
  filter: brightness(0);
  opacity: 0.9;
}

/* Remove the fixed title section styles and update for floating panel */
.title-panel {
  background: var(--surface-card);
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  border: 1px solid var(--surface-border);
  margin: 24px;
  padding: 16px 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.title-logo {
  height: 28px;
  width: auto;
}

.title-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

/* Update styles to match navbar brand */
.brand {
  display: flex;
  align-items: center;
}

.brand-name {
  font-size: 2rem;
  font-weight: 600;
  display: inline-flex;
  align-items: baseline;
}

.brand-title {
  font-family: 'Ubuntu', sans-serif;
  letter-spacing: -0.005em;
  white-space: nowrap;
}

.brand-highlight {
  font-family: 'Ubuntu', sans-serif;
  color: var(--primary-color);
}

.brand-divider {
  font-family: var(--font-family);
  color: var(--text-color-secondary);
  margin: 0 0.3em;
  font-weight: normal;
}

.brand-section {
  font-family: var(--font-family);
  color: var(--text-color-secondary);
  font-size: 1.75rem;
  font-weight: normal;
  margin-left: 0.3em;
}

/* Remove old title styles */
.title-section,
.title-logo,
.title-text {
  display: none;
}
</style> 