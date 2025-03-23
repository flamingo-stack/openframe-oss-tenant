<template>
  <div class="rac-dashboard">
    <ModuleHeader title="Dashboard">
      <template #subtitle>Overview of remote device status and activity</template>
    </ModuleHeader>
    
    <div class="dashboard-grid">
      <!-- Device Statistics -->
      <div class="dashboard-card device-stats">
        <h3><i class="pi pi-desktop"></i> Device Overview</h3>
        <div class="empty-state">
          <i class="pi pi-desktop empty-icon"></i>
          <h3>No Devices Found</h3>
          <p>There are no devices connected via MeshCentral yet.</p>
          <p class="hint">Add devices to start managing them remotely.</p>
        </div>
      </div>
      
      <!-- Connection Status -->
      <div class="dashboard-card connection-status">
        <h3><i class="pi pi-link"></i> Connection Status</h3>
        <div class="empty-state">
          <i class="pi pi-link empty-icon"></i>
          <h3>No Active Connections</h3>
          <p>No remote connections are currently active.</p>
          <p class="hint">Connect to a device to see connection details here.</p>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="dashboard-card recent-activity">
        <h3><i class="pi pi-history"></i> Recent Activity</h3>
        <div class="empty-state">
          <i class="pi pi-history empty-icon"></i>
          <h3>No Recent Activity</h3>
          <p>No recent remote access activity to display.</p>
          <p class="hint">Activity will appear here as you connect to devices.</p>
        </div>
      </div>
      
      <!-- File Transfer -->
      <div class="dashboard-card file-transfer">
        <h3><i class="pi pi-file"></i> File Transfer</h3>
        <div class="empty-state">
          <i class="pi pi-file empty-icon"></i>
          <h3>No File Transfers</h3>
          <p>No file transfers have been initiated yet.</p>
          <p class="hint">File transfers will appear here once you start transferring files.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "@vue/runtime-core";
import ModuleHeader from "../../components/shared/ModuleHeader.vue";
import { ConfigService } from "../../config/config.service";
import { ToastService } from "../../services/ToastService";

const configService = ConfigService.getInstance();
const runtimeConfig = configService.getConfig();
const API_URL = `${runtimeConfig.gatewayUrl}/tools/meshcentral`;
const toastService = ToastService.getInstance();
</script>

<style scoped>
.rac-dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface-ground);
  padding: 1.5rem;
  overflow-y: auto;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
}

.dashboard-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.dashboard-card > :not(h3) {
  flex: 1;
}

.dashboard-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dashboard-card h3 i {
  color: var(--primary-color);
  opacity: 0.8;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-state .empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.5;
}

.empty-state p.hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  opacity: 0.8;
}

@media screen and (max-width: 960px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
