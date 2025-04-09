<template>
  <div class="monitoring-page">
    <div class="of-mdm-header">
      <h1 class="of-title">Monitoring</h1>
    </div>

    <!-- Add loading state -->
    <div v-if="loading" class="loading-spinner">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
    </div>

    <template v-else-if="error">
      <div class="error-message">
        {{ error.message }}
      </div>
    </template>

    <template v-else>
      <section class="mb-4">
        <h2>System Overview</h2>
        <div class="grid">
          <!-- Services Health Status -->
          <div class="col-12 mb-3">
            <div class="tool-card">
              <div class="grid">
                <div v-for="(panel, index) in systemOverviewPanels" :key="index" class="col-12 md:col-3">
                  <div class="chart-container" :class="{ 'chart-loading': !panel.loaded }">
                    <div v-if="!panel.loaded" class="chart-placeholder">
                      <i class="pi pi-spin pi-spinner"></i>
                    </div>
                    <iframe
                      v-show="panel.loaded"
                      :src="getGrafanaUrl(panel.id)"
                      width="100%"
                      height="100"
                      :title="panel.title"
                      @load="panel.loaded = true"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Memory and CPU Usage -->
          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <div class="chart-container" :class="{ 'chart-loading': !memoryChartLoaded }">
                <div v-if="!memoryChartLoaded" class="chart-placeholder">
                  <i class="pi pi-spin pi-spinner"></i>
                </div>
                <iframe
                  v-show="memoryChartLoaded"
                  :src="getGrafanaUrl(26)"
                  width="100%"
                  height="300"
                  title="Memory Usage Chart"
                  @load="memoryChartLoaded = true"
                ></iframe>
              </div>
            </div>
          </div>

          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <div class="chart-container" :class="{ 'chart-loading': !cpuChartLoaded }">
                <div v-if="!cpuChartLoaded" class="chart-placeholder">
                  <i class="pi pi-spin pi-spinner"></i>
                </div>
                <iframe
                  v-show="cpuChartLoaded"
                  :src="getGrafanaUrl(20)"
                  width="100%"
                  height="300"
                  title="CPU Usage Chart"
                  @load="cpuChartLoaded = true"
                ></iframe>
              </div>
            </div>
          </div>

          <!-- API Performance -->
          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <div class="chart-container" :class="{ 'chart-loading': !apiChartLoaded }">
                <div v-if="!apiChartLoaded" class="chart-placeholder">
                  <i class="pi pi-spin pi-spinner"></i>
                </div>
                <iframe
                  v-show="apiChartLoaded"
                  :src="getGrafanaUrl(28)"
                  width="100%"
                  height="300"
                  title="API Performance"
                  @load="apiChartLoaded = true"
                ></iframe>
              </div>
            </div>
          </div>

          <!-- Error Rates -->
          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <div class="chart-container" :class="{ 'chart-loading': !errorChartLoaded }">
                <div v-if="!errorChartLoaded" class="chart-placeholder">
                  <i class="pi pi-spin pi-spinner"></i>
                </div>
                <iframe
                  v-show="errorChartLoaded"
                  :src="getGrafanaUrl(24)"
                  width="100%"
                  height="300"
                  title="Error Rates"
                  @load="errorChartLoaded = true"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- System Health Section -->
      <section class="mb-4">
        <h2>System Health</h2>
        <div class="grid">
          <div v-for="(panel, index) in systemHealthPanels" :key="index" class="col-12 md:col-3 mb-3">
            <div class="tool-card">
              <h3>{{ panel.title }}</h3>
              <div class="chart-container" :class="{ 'chart-loading': !panel.loaded }">
                <div v-if="!panel.loaded" class="chart-placeholder">
                  <i class="pi pi-spin pi-spinner"></i>
                </div>
                <iframe
                  v-show="panel.loaded"
                  :src="getGrafanaUrl(panel.id)"
                  width="100%"
                  height="200"
                  :title="panel.title"
                  @load="panel.loaded = true"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onMounted, computed } from '@vue/runtime-core'
import { useThemeStore } from '@/stores/themeStore'
import { ConfigService } from '@/config/config.service'

const loading = ref(true)
const error = ref<Error | null>(null)
const themeStore = useThemeStore()
const configService = ConfigService.getInstance()

// Chart loading states
const memoryChartLoaded = ref(false)
const cpuChartLoaded = ref(false)
const apiChartLoaded = ref(false)
const errorChartLoaded = ref(false)

// System overview panels
const systemOverviewPanels = ref([
  { id: 11, title: 'Services Health Status', loaded: false },
  { id: 12, title: 'Service Uptime', loaded: false },
  { id: 13, title: 'Service Performance', loaded: false },
  { id: 14, title: 'Service Errors', loaded: false },
  { id: 30, title: 'Resource Usage', loaded: false },
  { id: 16, title: 'System Metrics', loaded: false },
  { id: 17, title: 'System Health', loaded: false },
  { id: 18, title: 'System Load', loaded: false }
])

// System health panels
const systemHealthPanels = ref([
  { id: 20, title: 'CPU Usage', loaded: false },
  { id: 26, title: 'Memory Usage', loaded: false },
  { id: 19, title: 'Network Traffic', loaded: false },
  { id: 29, title: 'System Load', loaded: false }
])

const grafanaTheme = computed(() => themeStore.isDark ? 'dark' : 'light')

const getGrafanaUrl = (panelId: number) => {
  const config = configService.getConfig()
  return `${config.grafanaUrl}/d-solo/home/openframe-overview?orgId=1&panelId=${panelId}&theme=${grafanaTheme.value}&refresh=1s`
}

onMounted(() => {
  // Show content immediately, charts will load asynchronously
  loading.value = false
})
</script>

<style scoped>
.monitoring-page {
  padding: 2rem;
}

.of-mdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.of-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
}

.tool-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  height: 100%;
}

.tool-card h3 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 1.125rem;
}

.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: var(--primary-color);
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-color-secondary);
}

.chart-container {
  position: relative;
  min-height: 100px;
  background: var(--surface-card);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.chart-loading {
  background: var(--surface-ground);
}

.chart-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

iframe {
  border: none;
  background: var(--surface-card);
}
</style>