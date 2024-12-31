<template>
  <div class="architecture-container">
    <div class="architecture-diagram">
      <VueFlow
        v-model="elements"
        :default-viewport="{ x: 0, y: 0, zoom: 0.75 }"
        :min-zoom="0.75"
        :max-zoom="0.75"
        :fit-view-on-init="true"
        :nodes-draggable="false"
        :nodes-connectable="false"
        :elements-selectable="false"
        :pan-on-drag="false"
        :zoom-on-scroll="false"
        :zoom-on-pinch="false"
        :zoom-on-double-click="false"
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
        <Panel position="top-left" class="legend">
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
import { ref, onMounted } from 'vue'
import { VueFlow, Panel, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { Edge, Node } from '@vue-flow/core'
import { useThemeStore } from '@/stores/themeStore'
import { storeToRefs } from 'pinia'
import { getLogoUrl } from '@/services/LogoService'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const elements = ref<Array<Node | Edge>>([])

// Node type colors - using OpenFrame UI theme colors
const nodeTypes = {
  'Interface': 'var(--yellow-500)',           // Yellow for UI
  'Application': 'var(--bluegray-700)',       // Dark Blue-Gray for core apps
  'Config': 'var(--yellow-600)',              // Darker Yellow for config
  'Streaming': 'var(--blue-600)',             // Blue for streaming
  'Data Integration': 'var(--blue-800)',      // Dark Blue for integration
  'Databases': 'var(--gray-700)',             // Dark Gray for databases
  'Integrated Tools': 'var(--yellow-400)',    // Light Yellow for tools
  'Monitoring': 'var(--bluegray-500)'         // Medium Blue-Gray for monitoring
}

// Add error handler for logo loading
const onLogoError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
};

onMounted(() => {
  // Basic node setup
  const nodes: Node[] = [
    // Interface
    { id: 'ui', data: { label: 'OpenFrame UI', logo: getLogoUrl('openframe-ui', isDark.value) }, 
      position: { x: 50, y: 300 }, class: 'interface' },
    
    // Application
    { id: 'api', data: { label: 'OpenFrame API', logo: getLogoUrl('openframe-api', isDark.value) },
      position: { x: 350, y: 150 }, class: 'application' },
    { id: 'gateway', data: { label: 'OpenFrame Gateway', logo: getLogoUrl('openframe-gateway', isDark.value) },
      position: { x: 350, y: 250 }, class: 'application' },
    { id: 'stream', data: { label: 'OpenFrame Stream', logo: getLogoUrl('openframe-stream', isDark.value) },
      position: { x: 350, y: 350 }, class: 'application' },
    { id: 'management', data: { label: 'OpenFrame Management', logo: getLogoUrl('openframe-management', isDark.value) },
      position: { x: 350, y: 450 }, class: 'application' },
    
    // Config
    { id: 'config', data: { label: 'OpenFrame Config', logo: getLogoUrl('openframe-config', isDark.value) },
      position: { x: 650, y: 200 }, class: 'config' },
    
    // Streaming
    { id: 'kafka', data: { label: 'Apache Kafka', logo: getLogoUrl('kafka-primary', isDark.value) },
      position: { x: 950, y: 150 }, class: 'streaming' },
    { id: 'zookeeper', data: { label: 'Apache Zookeeper', logo: getLogoUrl('zookeeper-primary', isDark.value) },
      position: { x: 950, y: 250 }, class: 'streaming' },
    
    // Integration
    { id: 'nifi', data: { label: 'Apache NiFi', logo: getLogoUrl('nifi-primary', isDark.value) },
      position: { x: 1250, y: 200 }, class: 'integration' },
    
    // Databases
    { id: 'cassandra', data: { label: 'Cassandra', logo: getLogoUrl('cassandra-primary', isDark.value) },
      position: { x: 1550, y: 50 }, class: 'database' },
    { id: 'mongodb', data: { label: 'MongoDB', logo: getLogoUrl('mongodb-primary', isDark.value) },
      position: { x: 1550, y: 150 }, class: 'database' },
    { id: 'mysql', data: { label: 'MySQL', logo: getLogoUrl('mysql-primary', isDark.value) },
      position: { x: 1550, y: 250 }, class: 'database' },
    { id: 'redis', data: { label: 'Redis', logo: getLogoUrl('redis-primary', isDark.value) },
      position: { x: 1550, y: 350 }, class: 'database' },
    { id: 'pinot', data: { label: 'Apache Pinot', logo: getLogoUrl('pinot-controller', isDark.value) },
      position: { x: 1550, y: 450 }, class: 'database' },
    
    // Tools
    { id: 'fleet', data: { label: 'Fleet MDM', logo: getLogoUrl('fleet', isDark.value) },
      position: { x: 1850, y: 150 }, class: 'tools' },
    { id: 'authentik', data: { label: 'Authentik', logo: getLogoUrl('authentik', isDark.value) },
      position: { x: 1850, y: 250 }, class: 'tools' },
    
    // Monitoring
    { id: 'grafana', data: { label: 'Grafana', logo: getLogoUrl('grafana-primary', isDark.value) },
      position: { x: 650, y: 600 }, class: 'monitoring' },
    { id: 'loki', data: { label: 'Grafana Loki', logo: getLogoUrl('loki-primary', isDark.value) },
      position: { x: 1250, y: 600 }, class: 'monitoring' },
    { id: 'prometheus', data: { label: 'Prometheus', logo: getLogoUrl('prometheus-primary', isDark.value) },
      position: { x: 1850, y: 600 }, class: 'monitoring' }
  ]

  // Basic edge setup
  const edges: Edge[] = [
    // Traffic flows (solid lines)
    { id: 'ui-api', source: 'ui', target: 'api', class: 'traffic-flow' },
    { id: 'gateway-fleet', source: 'gateway', target: 'fleet', class: 'traffic-flow' },
    { id: 'gateway-teleport', source: 'gateway', target: 'teleport', class: 'traffic-flow' },
    { id: 'gateway-tactical', source: 'gateway', target: 'tactical', class: 'traffic-flow' },
    { id: 'gateway-grafana', source: 'gateway', target: 'grafana', class: 'traffic-flow' },
    
    // Data flows (dashed lines)
    { id: 'api-config', source: 'api', target: 'config', class: 'data-flow' },
    { id: 'gateway-config', source: 'gateway', target: 'config', class: 'data-flow' },
    { id: 'stream-config', source: 'stream', target: 'config', class: 'data-flow' },
    { id: 'management-config', source: 'management', target: 'config', class: 'data-flow' },
    { id: 'stream-kafka', source: 'stream', target: 'kafka', class: 'data-flow' },
    { id: 'api-kafka', source: 'api', target: 'kafka', class: 'data-flow' },
    { id: 'kafka-zookeeper', source: 'kafka', target: 'zookeeper', class: 'data-flow' },
    { id: 'kafka-nifi', source: 'kafka', target: 'nifi', class: 'data-flow' },
    { id: 'management-mongo', source: 'management', target: 'mongodb', class: 'data-flow' },
    { id: 'api-mongo', source: 'api', target: 'mongodb', class: 'data-flow' },
    { id: 'stream-cassandra', source: 'stream', target: 'cassandra', class: 'data-flow' },
    { id: 'stream-pinot', source: 'stream', target: 'pinot', class: 'data-flow' },
    { id: 'teleport-mysql', source: 'teleport', target: 'mysql', class: 'data-flow' },
    { id: 'tactical-mysql', source: 'tactical', target: 'mysql', class: 'data-flow' },
    { id: 'fleet-mysql', source: 'fleet', target: 'mysql', class: 'data-flow' },
    { id: 'prometheus-grafana', source: 'prometheus', target: 'grafana', class: 'data-flow' },
    { id: 'loki-grafana', source: 'loki', target: 'grafana', class: 'data-flow' }
  ]

  elements.value = [...nodes, ...edges]
})
</script>

<style scoped>
.architecture-container {
  width: 100%;
  height: calc(100vh - 64px);  /* Subtract header height */
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
  overflow: hidden;  /* Prevent scrolling */
  position: fixed;   /* Fix the container */
  top: 64px;        /* Account for header */
  left: 0;
  right: 0;
  bottom: 0;
}

.architecture-diagram {
  flex: 1;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;  /* Prevent diagram scrolling */
}

.diagram {
  width: 100%;
  height: 100%;
  overflow: hidden;  /* Prevent inner scrolling */
}

/* Legend styles */
.legend {
  background: var(--surface-card);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  font-family: var(--font-family);
  margin: 8px;
  min-width: 150px;
  border: 1px solid var(--surface-border);
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 5;
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
  margin: 2px 0;
  padding: 3px 4px;
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
  padding: 12px 20px;
  border-radius: 12px;
  width: 260px;
  height: 65px;
  font-size: 16px;
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
  gap: 12px;
}

:deep(.node-label) {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.node-logo) {
  height: 32px;
  width: 64px;
  object-fit: contain;
  object-position: right;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

:deep(.vue-flow__node.interface) { background-color: var(--yellow-500); }
:deep(.vue-flow__node.application) { background-color: var(--bluegray-700); }
:deep(.vue-flow__node.config) { background-color: var(--yellow-600); }
:deep(.vue-flow__node.streaming) { background-color: var(--blue-600); }
:deep(.vue-flow__node.integration) { background-color: var(--blue-800); }
:deep(.vue-flow__node.database) { background-color: var(--gray-700); }
:deep(.vue-flow__node.tools) { background-color: var(--yellow-400); }
:deep(.vue-flow__node.monitoring) { background-color: var(--bluegray-500); }

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
  stroke-width: 2.5;
  stroke-opacity: 0.6;
}

:deep(.vue-flow__edge.traffic-flow .vue-flow__edge-path) {
  stroke-width: 3;
  stroke-dasharray: none;
}

:deep(.vue-flow__edge.data-flow .vue-flow__edge-path) {
  stroke-width: 2.5;
  stroke-dasharray: 5;
  animation: flowAnimation 30s linear infinite;
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke-opacity: 0.6;
  stroke-width: 2.5;
}

@keyframes flowAnimation {
  from { stroke-dashoffset: 100; }
  to { stroke-dashoffset: 0; }
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
:deep(.node-logo) {
  height: 32px;
  width: 64px;
  object-fit: contain;
  object-position: right;
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

:deep(.vue-flow__node.tools .node-logo),
:deep(.vue-flow__node.interface .node-logo) {
  filter: brightness(0);
  opacity: 0.9;
}
</style> 