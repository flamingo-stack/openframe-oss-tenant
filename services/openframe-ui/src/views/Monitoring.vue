<template>
  <div class="monitoring-page">
    <h1 class="page-title">Monitoring</h1>

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
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(11)"
                    width="100%"
                    height="100"
                    title="Services Health Status"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(12)"
                    width="100%"
                    height="100"
                    title="Service Uptime"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(13)"
                    width="100%"
                    height="100"
                    title="Service Performance"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(14)"
                    width="100%"
                    height="100"
                    title="Service Errors"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(30)"
                    width="100%"
                    height="100"
                    title="Resource Usage"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(16)"
                    width="100%"
                    height="100"
                    title="System Metrics"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(17)"
                    width="100%"
                    height="100"
                    title="System Health"
                  ></iframe>
                </div>
                <div class="col-12 md:col-3">
                  <iframe
                    :src="getGrafanaUrl(18)"
                    width="100%"
                    height="100"
                    title="System Load"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>

          <!-- Memory and CPU Usage -->
          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <iframe
                :src="getGrafanaUrl(26)"
                width="100%"
                height="300"
                title="Memory Usage Chart"
              ></iframe>
            </div>
          </div>

          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <iframe
                :src="getGrafanaUrl(20)"
                width="100%"
                height="300"
                title="Memory Usage Chart"
              ></iframe>
            </div>
          </div>

          <!-- API Performance -->
          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <iframe
                :src="getGrafanaUrl(28)"
                width="100%"
                height="300"
                title="API Performance"
              ></iframe>
            </div>
          </div>

          <!-- Error Rates -->
          <div class="col-12 md:col-6 mb-3">
            <div class="tool-card">
              <iframe
                :src="getGrafanaUrl(24)"
                width="100%"
                height="300"
                title="Error Rates"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      <!-- System Health Section -->
      <section class="mb-4">
        <h2>System Health</h2>
        <div class="grid">
          <div class="col-12 md:col-3 mb-3">
            <div class="tool-card">
              <h3>CPU Usage</h3>
              <iframe
                :src="getGrafanaUrl(20)"
                width="100%"
                height="200"
                title="CPU Usage"
              ></iframe>
            </div>
          </div>

          <div class="col-12 md:col-3 mb-3">
            <div class="tool-card">
              <h3>Memory Usage</h3>
              <iframe
                :src="getGrafanaUrl(26)"
                width="100%"
                height="200"
                title="Memory Usage"
              ></iframe>
            </div>
          </div>

          <div class="col-12 md:col-3 mb-3">
            <div class="tool-card">
              <h3>Network Traffic</h3>
              <iframe
                :src="getGrafanaUrl(19)"
                width="100%"
                height="200"
                title="Network Traffic Chart"
              ></iframe>
            </div>
          </div>

          <div class="col-12 md:col-3 mb-3">
            <div class="tool-card">
              <h3>System Load</h3>
              <iframe
                :src="getGrafanaUrl(29)"
                width="100%"
                height="200"
                title="System Load Chart"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useThemeStore } from '@/stores/themeStore'

const loading = ref(true)
const error = ref<Error | null>(null)
const themeStore = useThemeStore()

const grafanaTheme = computed(() => themeStore.isDark ? 'dark' : 'light')

const getGrafanaUrl = (panelId: number) => {
  return `http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=${panelId}&theme=${grafanaTheme.value}&refresh=1s`
}

onMounted(() => {
  // Add a small delay to ensure Grafana is ready
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style scoped>
.monitoring-page {
  padding: 2rem;
}

.page-title {
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
  color: white !important;
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

iframe {
  border: none;
  background: var(--surface-card);
}
</style> 