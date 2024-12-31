<template>
  <div class="architecture-container">
    <div class="architecture-diagram">
      <VueFlow
        v-model="elements"
        :default-viewport="{ x: 0, y: 0, zoom: 0.3 }"
        :min-zoom="0.2"
        :max-zoom="2"
        :fit-view-on-init="true"
        class="diagram"
      >
        <Background :gap="20" :color="isDark ? '#555' : '#aaa'" />
        <Controls />
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

onMounted(() => {
  // Basic node setup
  const nodes: Node[] = [
    // Interface
    { id: 'ui', data: { label: 'OpenFrame UI' }, position: { x: 0, y: 150 }, class: 'interface' },
    
    // Application
    { id: 'api', data: { label: 'OpenFrame API' }, position: { x: 300, y: 50 }, class: 'application' },
    { id: 'gateway', data: { label: 'OpenFrame Gateway' }, position: { x: 300, y: 150 }, class: 'application' },
    { id: 'stream', data: { label: 'OpenFrame Stream' }, position: { x: 300, y: 250 }, class: 'application' },
    { id: 'management', data: { label: 'OpenFrame Management' }, position: { x: 300, y: 350 }, class: 'application' },
    
    // Config
    { id: 'config', data: { label: 'OpenFrame Config' }, position: { x: 600, y: 200 }, class: 'config' },
    
    // Streaming
    { id: 'kafka', data: { label: 'Apache Kafka' }, position: { x: 900, y: 150 }, class: 'streaming' },
    { id: 'zookeeper', data: { label: 'Apache Zookeeper' }, position: { x: 900, y: 250 }, class: 'streaming' },
    
    // Integration
    { id: 'nifi', data: { label: 'Apache NiFi' }, position: { x: 1200, y: 200 }, class: 'integration' },
    
    // Databases
    { id: 'cassandra', data: { label: 'Cassandra' }, position: { x: 1500, y: 50 }, class: 'database' },
    { id: 'mongodb', data: { label: 'MongoDB' }, position: { x: 1500, y: 150 }, class: 'database' },
    { id: 'mysql', data: { label: 'MySQL' }, position: { x: 1500, y: 250 }, class: 'database' },
    { id: 'redis', data: { label: 'Redis' }, position: { x: 1500, y: 350 }, class: 'database' },
    { id: 'pinot', data: { label: 'Apache Pinot' }, position: { x: 1500, y: 450 }, class: 'database' },
    
    // Tools
    { id: 'fleet', data: { label: 'Fleet MDM' }, position: { x: 1800, y: 150 }, class: 'tools' },
    { id: 'teleport', data: { label: 'Teleport ZTNA' }, position: { x: 1800, y: 250 }, class: 'tools' },
    { id: 'tactical', data: { label: 'Tactical RMM' }, position: { x: 1800, y: 350 }, class: 'tools' },
    
    // Monitoring
    { id: 'grafana', data: { label: 'Grafana' }, position: { x: 600, y: 600 }, class: 'monitoring' },
    { id: 'loki', data: { label: 'Grafana Loki' }, position: { x: 1200, y: 600 }, class: 'monitoring' },
    { id: 'prometheus', data: { label: 'Prometheus' }, position: { x: 1800, y: 600 }, class: 'monitoring' }
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
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
}

.architecture-diagram {
  flex: 1;
  width: 100%;
}

.diagram {
  width: 100%;
  height: 100%;
}

/* Legend styles */
.legend {
  background: var(--surface-card);
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  font-family: var(--font-family);
  margin: 16px;
  min-width: 180px;
  border: 1px solid var(--surface-border);
}

.legend-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 4px 0;
  color: var(--text-color);
  font-size: 14px;
  font-weight: var(--font-weight-normal);
}

.legend-separator {
  height: 1px;
  background: var(--surface-border);
  margin: 10px 0;
  opacity: 0.5;
}

/* Node styles */
:deep(.vue-flow__node) {
  padding: 12px;
  border-radius: 12px;
  width: 280px;
  height: 65px;
  text-align: center;
  font-size: 18px;
  font-family: var(--font-family);
  font-weight: 500;
  color: white;
  border: 2px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
  width: 30px;
  height: 0;
  margin-right: 8px;
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
  width: 16px;
  height: 16px;
  margin-right: 10px;
  border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.2);
}

/* Make legend lines more visible */
.legend-line {
  width: 30px;
  height: 0;
  margin-right: 8px;
  position: relative;
}

.legend-line.traffic-line {
  border-top: 3px solid var(--bluegray-400);
  opacity: 0.6;
}

.legend-line.data-line {
  border-top: 3px dashed var(--bluegray-400);
  opacity: 0.6;
}
</style> 