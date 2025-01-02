<template>
  <div class="mdm-profiles">
    <div class="of-mdm-header">
      <h1 class="of-title">Profiles</h1>
    </div>

    <div class="w-30rem mr-auto">
      <div class="p-inputgroup">
        <span class="p-inputgroup-addon">
          <i class="pi pi-search"></i>
        </span>
        <InputText 
          v-model="filters['global'].value" 
          placeholder="Search profiles..." 
        />
      </div>
    </div>

    <div class="profiles-content">
      <DataTable 
        :value="profiles" 
        :paginator="true" 
        :rows="10"
        :rowsPerPageOptions="[10, 20, 50]"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        v-model:filters="filters"
        filterDisplay="menu"
        :loading="loading"
        :globalFilterFields="['name', 'platform', 'identifier']"
        stripedRows
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-file empty-icon"></i>
            <h3>No Profiles Found</h3>
            <p>There are no configuration profiles available.</p>
            <p class="hint">Add profiles to manage device settings and configurations.</p>
          </div>
        </template>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center">
              <i class="pi pi-file mr-2"></i>
              <div class="profile-info">
                <span class="profile-name">{{ data.name }}</span>
                <span class="profile-identifier text-sm text-color-secondary">{{ data.identifier }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="platform" header="Platform" sortable style="width: 150px">
          <template #body="{ data }">
            <Tag :value="formatPlatform(data.platform)" 
                 :severity="getPlatformSeverity(data.platform)" />
          </template>
        </Column>

        <Column field="created_at" header="Created" sortable style="width: 200px">
          <template #body="{ data }">
            <span class="text-sm">{{ new Date(data.created_at).toLocaleString() }}</span>
          </template>
        </Column>

        <Column field="updated_at" header="Updated" sortable style="width: 200px">
          <template #body="{ data }">
            <span class="text-sm">{{ new Date(data.updated_at).toLocaleString() }}</span>
          </template>
        </Column>

        <Column field="actions" header="Actions" :sortable="false" style="width: 100px">
          <template #body="{ data }">
            <div class="flex gap-2 justify-content-center">
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                v-tooltip.top="'Edit Profile'"
                @click="editProfile(data)" 
              />
              <Button 
                icon="pi pi-trash" 
                class="p-button-text p-button-sm p-button-danger" 
                v-tooltip.top="'Delete Profile'"
                @click="deleteProfile(data)" 
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Tooltip from 'primevue/tooltip';
import { FilterMatchMode } from 'primevue/api';
import { restClient } from '../../apollo/apolloClient';
import { config as envConfig } from '../../config/env.config';
import { ToastService } from '../../services/ToastService';

const API_URL = `${envConfig.GATEWAY_URL}/tools/fleet/api/v1/fleet`;

const router = useRouter();
const toast = useToast();
const toastService = ToastService.getInstance();
toastService.setToastInstance(toast);

const loading = ref(true);
const profiles = ref<Profile[]>([]);

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const formatPlatform = (platform: string) => {
  if (!platform) return 'All Platforms';
  const platforms = platform.split(',');
  if (platforms.length > 1) return 'Multiple';
  
  const platformMap: Record<string, string> = {
    darwin: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    ios: 'iOS',
    ipados: 'iPadOS'
  };
  return platformMap[platform] || platform;
};

const getPlatformSeverity = (platform: string) => {
  if (!platform || platform.includes(',')) return 'info';
  const severityMap: Record<string, string> = {
    darwin: 'info',
    windows: 'warning',
    linux: 'success',
    ios: 'info',
    ipados: 'info'
  };
  return severityMap[platform] || 'info';
};

const extractUrlFromMessage = (message: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = message.match(urlRegex);
  if (match) {
    const url = match[0];
    const textWithoutUrl = message.replace(url, '');
    return { url, text: textWithoutUrl.trim() };
  }
  return { text: message };
};

interface Profile {
  profile_uuid: string;
  name: string;
  identifier: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

interface FleetErrorResponse {
  message: string;
  errors?: Array<{
    name: string;
    reason: string;
  }>;
}

interface FleetResponse<T> {
  data?: T;
  error?: FleetErrorResponse;
}

const fetchProfiles = async () => {
  loading.value = true;
  try {
    const response = await restClient.get(`${API_URL}/configuration_profiles`) as FleetResponse<any[]>;
    profiles.value = response.data || [];
  } catch (err: any) {
    toastService.showError(err.message);
  } finally {
    loading.value = false;
  }
};

const deleteProfile = async (profile: any) => {
  try {
    await restClient.delete(`${API_URL}/configuration_profiles/${profile.profile_uuid}`);
    await fetchProfiles();
    toastService.showSuccess('Profile deleted successfully');
  } catch (err: any) {
    toastService.showError(err.message);
  }
};

const editProfile = (profile: any) => {
  // TODO: Implement profile editing
  console.log('Edit profile:', profile);
};

// Add navigation guard to dismiss toasts
router.beforeEach((to, from, next) => {
  toastService.clear();
  next();
});

onMounted(() => {
  fetchProfiles();
});
</script>

<style scoped>
.mdm-profiles {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.of-mdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.of-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.profiles-content {
  flex: 1;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  .profile-name {
    font-weight: 500;
  }

  .profile-identifier {
    color: var(--text-color-secondary);
  }
}

:deep(.p-datatable) {
  .p-datatable-wrapper {
    border-radius: var(--border-radius);
    background: var(--surface-card);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .p-datatable-header {
    background: var(--surface-card);
    padding: 1.5rem;
    border: none;
    border-bottom: 1px solid var(--surface-border);
  }

  .p-datatable-thead > tr > th {
    background: var(--surface-card);
    color: var(--text-color-secondary);
    padding: 1rem 1.5rem;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: none;
    border-bottom: 2px solid var(--surface-border);

    &:first-child {
      border-top-left-radius: var(--border-radius);
    }

    &:last-child {
      border-top-right-radius: var(--border-radius);
    }
  }

  .p-datatable-tbody > tr {
    background: var(--surface-card);
    transition: all 0.2s ease;
    border-bottom: 1px solid var(--surface-border);

    &:hover {
      background: var(--surface-hover);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    > td {
      padding: 1.25rem 1.5rem;
      border: none;
      color: var(--text-color);
      font-size: 0.875rem;
      line-height: 1.5;

      .pi {
        font-size: 1.125rem;
        color: var(--primary-color);

        &.pi-file {
          color: var(--text-color-secondary);
          opacity: 0.7;
        }
      }
    }

    &:last-child {
      border-bottom: none;
      
      > td:first-child {
        border-bottom-left-radius: var(--border-radius);
      }
      
      > td:last-child {
        border-bottom-right-radius: var(--border-radius);
      }
    }
  }

  .p-paginator {
    background: var(--surface-ground);
    border: none;
    padding: 1.25rem 1rem;
    margin-top: 1rem;
    border-radius: var(--border-radius);

    .p-paginator-pages .p-paginator-page {
      min-width: 2.5rem;
      height: 2.5rem;
      margin: 0 0.25rem;
      border-radius: var(--border-radius);
      font-weight: 600;
      transition: all 0.2s ease;

      &.p-highlight {
        background: var(--primary-color);
        color: var(--primary-color-text);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.4);
      }

      &:not(.p-highlight):hover {
        background: var(--surface-hover);
        transform: translateY(-1px);
      }
    }
  }
}

:deep(.p-tag) {
  padding: 0.35rem 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 2rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-tag-success {
    background: var(--green-50);
    color: var(--green-900);
    border: 1px solid var(--green-200);
  }

  &.p-tag-danger {
    background: var(--red-50);
    color: var(--red-900);
    border: 1px solid var(--red-200);
  }

  &.p-tag-warning {
    background: var(--yellow-50);
    color: var(--yellow-900);
    border: 1px solid var(--yellow-200);
  }

  &.p-tag-info {
    background: var(--blue-50);
    color: var(--blue-900);
    border: 1px solid var(--blue-200);
  }
}

:deep(.p-button.p-button-icon-only) {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;

  &.p-button-text:enabled:hover {
    background: var(--surface-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &.p-button-danger:enabled:hover {
    background: var(--red-50);
    color: var(--red-900);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .pi {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  &:hover .pi {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.6;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: var(--surface-card);
  border-radius: var(--border-radius);

  .empty-icon {
    font-size: 3rem;
    color: var(--text-color-secondary);
    margin-bottom: 1.5rem;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.5rem 0;
  }

  p {
    color: var(--text-color-secondary);
    margin: 0;
    line-height: 1.5;

    &.hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
      opacity: 0.8;
    }
  }
}

:deep(.p-toast-message-error) {
  a {
    color: #ffffff !important;
    text-decoration: underline;
    cursor: pointer;
    
    &:hover {
      text-decoration: none;
      opacity: 0.9;
    }
  }
}

:deep(.error-toast-content) {
  white-space: pre-line;
  word-break: break-word;
  
  &.clickable-toast {
    cursor: pointer;
    transition: opacity 0.2s ease;
    
    &:hover {
      opacity: 0.9;
    }
  }
}
</style> 