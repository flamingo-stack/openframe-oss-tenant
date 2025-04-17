<template>
  <div class="tools-dashboard">
    <div class="of-mdm-header">
      <h1 class="of-title">Infrastructure</h1>
      <div class="header-actions">
      </div>
    </div>
    
    <div class="filters mb-4 flex align-items-center">
      <div class="w-30rem mr-auto">
        <div class="p-inputgroup">
          <span class="p-inputgroup-addon">
            <i class="pi pi-search"></i>
          </span>
          <InputText 
            v-model="filter.search" 
            placeholder="Search tools..." 
            @input="debouncedRefetch"
          />
        </div>
      </div>
      <div class="w-15rem">
        <Dropdown
          v-model="filter.category"
          :options="categories"
          placeholder="Filter by type"
          class="w-full surface-card"
          :panelClass="'surface-0'"
          :pt="{
            panel: { class: 'shadow-2 border-none' },
            item: { class: 'p-3 text-base hover:surface-hover' }
          }"
          @change="refetch()"
        >
          <template #value="slotProps">
            <div class="flex align-items-center justify-content-between w-full">
              <span>{{ slotProps.value || 'Filter by type' }}</span>
              <i v-if="filter.category" 
                 class="pi pi-times cursor-pointer ml-2" 
                 @click.stop="() => { filter.category = null; refetch(); }"
              />
            </div>
          </template>
        </Dropdown>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      Loading tools...
    </div>
    <div v-else-if="error" class="error-message">
      {{ error.message }}
    </div>
    <div v-else-if="tools.length === 0" class="empty-state">
      No tools available
    </div>
    <div v-else>
      <section v-for="(sectionTools, section) in groupedTools" :key="section" class="mb-4">
        <h2>{{ section }}</h2>
        <div class="grid">
          <div 
            v-for="tool in sectionTools" 
            :key="tool.id" 
            class="col-12 md:col-6"
          >
            <div class="tool-card">
              <div :class="['tool-card-inner', getCategoryClassForTool(tool)]">
                <div class="tool-header">
                  <h3>
                    <i :class="getIntegratedToolIcon(tool.toolType)" class="mr-2"></i>
                    {{ getDisplayName(tool) }}
                  </h3>
                  <span class="tool-category" :data-category="tool.category">{{ tool.category }}</span>
                  <img 
                    :src="getToolIcon(tool)" 
                    :alt="getDisplayName(tool)" 
                    class="tool-logo"
                    @error="onImageError"
                  />
                </div>
                <p class="tool-description">{{ tool.description }}</p>
                <div class="credentials">
                  <template v-for="(toolUrl, index) in tool.toolUrls" :key="index">
                    <div class="p-inputgroup mb-2">
                      <span class="p-inputgroup-addon" :title="toolUrl.type">{{ formatUrlType(toolUrl.type) }}</span>
                      <input class="p-inputtext p-component" readonly :value="getUrlWithPort(toolUrl)" />
                      <OFButton class="p-button-icon-only" @click.stop="() => copyToolUrl(toolUrl)">
                        <i class="pi pi-copy"></i>
                      </OFButton>
                      <OFButton class="p-button-icon-only" @click.stop="() => openToolUrl(toolUrl)">
                        <i class="pi pi-external-link"></i>
                      </OFButton>
                    </div>
                    <!-- Show API key for API URLs -->
                    <div v-if="toolUrl.type === 'API' && tool?.credentials?.apiKey" class="p-inputgroup mb-2 credential-group">
                      <span class="p-inputgroup-addon">{{ tool.credentials.apiKey.keyName || 'API Key' }}</span>
                      <Password 
                        :model-value="tool.credentials.apiKey.key" 
                        :feedback="false" 
                        readonly 
                        input-class="w-full" 
                        toggle-mask 
                      />
                      <OFButton class="p-button-icon-only" @click.stop="() => copyText(tool.credentials?.apiKey?.key)">
                        <i class="pi pi-copy"></i>
                      </OFButton>
                    </div>
                    <!-- Show username/password for DASHBOARD URLs -->
                    <template v-if="toolUrl.type === 'DASHBOARD'">
                      <div v-if="tool?.credentials?.username" class="p-inputgroup mb-2 credential-group">
                        <span class="p-inputgroup-addon">User</span>
                        <input class="p-inputtext p-component" readonly :value="tool.credentials?.username" />
                        <OFButton class="p-button-icon-only" @click.stop="() => copyText(tool.credentials?.username)">
                          <i class="pi pi-copy"></i>
                        </OFButton>
                      </div>
                      <div v-if="tool.credentials?.password" class="p-inputgroup mb-2 credential-group">
                        <span class="p-inputgroup-addon">Pass</span>
                        <Password 
                          :model-value="tool.credentials.password" 
                          :feedback="false" 
                          readonly 
                          input-class="w-full" 
                          toggle-mask 
                        />
                        <OFButton class="p-button-icon-only" @click.stop="() => copyText(tool.credentials?.password)">
                          <i class="pi pi-copy"></i>
                        </OFButton>
                      </div>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <AuthDebug v-if="isDevelopment" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useQuery, provideApolloClient } from '@vue/apollo-composable';
import { apolloClient } from '../apollo/apolloClient';
import gql from 'graphql-tag';
import type { IntegratedTool, ToolCredentials, ToolUrlType } from '../types/graphql';
import Password from 'primevue/password'
import { ApolloError } from '@apollo/client/errors';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import AuthDebug from '../components/AuthDebug.vue';
import { getLogoUrl } from '@/services/LogoService';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/stores/themeStore';
import { getDisplayName } from '../utils/displayUtils';
import { useRoute, useRouter } from 'vue-router';
import { getToolCategory, getCategoryClass, sortToolsByCategory } from '../utils/categoryUtils';
import { getIntegratedToolIcon } from '../utils/deviceUtils';
import { OFButton } from '../components/ui';

// Get theme store
const themeStore = useThemeStore();
const { isDark } = storeToRefs(themeStore);

// Import all logos
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
import openframeLogo from '@/assets/openframe-logo-black.svg'
import pinotLogo from '@/assets/pinot-logo.svg'
import kibanaLogo from '@/assets/kibana-logo.svg'
import redisLogo from '@/assets/redis-logo.svg'
import cassandraLogo from '@/assets/cassandra-logo.svg'
import zookeeperLogo from '@/assets/zookeeper-logo.svg'
import meshcentralLogo from '@/assets/meshcentral-logo.svg'
import tacticalRmmLogo from '@/assets/tactical-rmm-logo.svg'
import mysqlLogo from '@/assets/mysql-logo.svg'
import postgresqlLogo from '@/assets/postgresql-logo.svg'

// Provide Apollo client at component level
provideApolloClient(apolloClient);

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
      credentials {
        username
        password
        apiKey {
          key
          type
          keyName
        }
      }
      layer
      layerOrder
      layerColor
      metricsPath
      healthCheckEndpoint
      healthCheckInterval
      connectionTimeout
      readTimeout
      allowedEndpoints
    }
  }
`;

// Get route and router instances
const route = useRoute();
const router = useRouter();

// Initialize filter with URL query parameters if present
const filter = ref({
  enabled: true,
  category: route.query.category as string || null,
  search: route.query.search as string || ''
});

// Watch search field changes
watch(() => filter.value.search, (newSearch) => {
  // Update URL with new search term
  router.replace({
    query: { ...route.query, search: newSearch || undefined }
  });
  debouncedRefetch();
});

// Watch category changes
watch(() => filter.value.category, (newCategory) => {
  // Update URL with new category
  router.replace({
    query: { ...route.query, category: newCategory || undefined }
  });
  refetch();
});

// Update query to use filter
const { result, loading, error, refetch } = useQuery(
  INTEGRATED_TOOLS_QUERY, 
  () => ({
    filter: {
      enabled: filter.value.enabled,
      category: filter.value.category,
      search: filter.value.search || undefined
    }
  }),
  {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  }
);

const tools = ref<IntegratedTool[]>([]);

// Add retry mechanism
const retryFetch = async (attempts = 3, delay = 1000) => {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await refetch();
      if (result?.data) {
        return result;
      }
    } catch (e) {
      console.error(`Attempt ${i + 1} failed:`, e);
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Failed to fetch data after multiple attempts');
};

// Update the logo map
const logoMap: Record<string, string> = {
  'grafana-primary': grafanaLogo,
  'mongodb-primary': mongodbLogo,
  'tactical-rmm': tacticalRmmLogo,
  'mongo-express': mongoExpressLogo,
  'kafka-primary': kafkaLogo,
  'kafka-ui': kafkaLogo,
  'kibana': kibanaLogo,
  'fleet': fleetLogo,
  'authentik': authentikLogo,
  'prometheus-primary': prometheusLogo,
  'nifi-primary': nifiLogo,
  'pinot-primary': pinotLogo,
  'loki-primary': lokiLogo,
  'redis-primary': redisLogo,
  'integrated-tools-redis': redisLogo,
  'cassandra-primary': cassandraLogo,
  'zookeeper-primary': zookeeperLogo,
  'openframe-api': openframeLogo,
  'openframe-config': openframeLogo,
  'openframe-stream': openframeLogo,
  'openframe-ui': openframeLogo,
  'openframe-gateway': openframeLogo,
  'openframe-management': openframeLogo,
  'mysql-primary': mysqlLogo,
  'integrated-tools-mysql': mysqlLogo,
  'mysql': mysqlLogo,
  'openframe-integrated-tools-mysql': mysqlLogo,
  'postgresql-primary': postgresqlLogo,
  'integrated-tools-postgresql': postgresqlLogo,
  'postgresql': postgresqlLogo,
  'postgres': postgresqlLogo,
  'openframe-integrated-tools-postgresql': postgresqlLogo,
  'meshcentral': meshcentralLogo
};

// Compute unique categories from tools data
const categories = computed(() => {
  const uniqueCategories = new Set<string>();
  tools.value.forEach(tool => {
    if (tool.category) uniqueCategories.add(tool.category);
  });
  return Array.from(uniqueCategories).sort();
});

const getToolSection = (tool: IntegratedTool): string => {
  return getToolCategory(tool);
};

const groupedTools = computed(() => {
  return sortToolsByCategory(tools.value);
});

// Add immediate logging when component is mounted
onMounted(async () => {
  console.log('Tools component mounted');
  console.log('Initial loading state:', loading.value);
  console.log('Initial error state:', error.value);
  
  try {
    await retryFetch();
  } catch (e) {
    console.error('Refetch error:', e);
  }
  const token = localStorage.getItem('access_token');
  console.debug('Token present in Tools view:', !!token);
});

// Watch loading state
watch(loading, (isLoading) => {
  console.log('Loading state changed:', isLoading);
});

// Watch error state
watch(error, (newError: ApolloError | null) => {
  if (newError) {
    console.error('GraphQL query error:', newError);
  }
});

// Watch result with immediate effect
watch(result, (newResult) => {
  console.log('Result changed:', newResult);
  if (newResult?.integratedTools) {
    console.log('Received tools:', newResult.integratedTools);
    // Add detailed logging for debugging credentials
    newResult.integratedTools.forEach((tool: IntegratedTool) => {
      if (tool.credentials?.apiKey) {
        console.log(`Tool ${tool.name} has API Key:`, {
          key: tool.credentials.apiKey.key,
          type: tool.credentials.apiKey.type,
          keyName: tool.credentials.apiKey.keyName
        });
      }
      if (tool.toolUrls) {
        console.log(`Tool ${tool.name} URLs:`, tool.toolUrls);
      }
    });
    tools.value = newResult.integratedTools;
  }
}, { immediate: true });

const getToolIcon = (tool: IntegratedTool): string => {
  // First try to get logo by tool ID
  const logoByToolId = logoMap[tool.id];
  if (logoByToolId) {
    return logoByToolId;
  }

  // If no logo found by ID, try by toolType
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
    default:
      return openframeLogo;
  }
};

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  // Use a simpler default icon
  target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTEgMTVoLTJ2LTZoMnY2em0wLThoLTJWN2gydjJ6Ii8+PC9zdmc+';
  // Add a class to help with styling the fallback icon
  target.classList.add('fallback-icon');
};

const getUrlWithPort = (toolUrl: any): string => {
  if (!toolUrl?.url) return '';

  try {
    const urlObj = new URL(toolUrl.url);
    if (!urlObj.port && toolUrl.port) {
      urlObj.port = toolUrl.port;
    }
    return urlObj.toString();
  } catch {
    return toolUrl.url;
  }
};

const copyToolUrl = (toolUrl: any) => {
  const url = getUrlWithPort(toolUrl);
  if (url) {
    navigator.clipboard.writeText(url);
  }
};

const openToolUrl = (toolUrl: any) => {
  const url = getUrlWithPort(toolUrl);
  if (url) {
    window.open(url, '_blank');
  }
};

// Add debounce function
const debounce = (fn: Function, delay: number) => {
  let timeout: number;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// Create debounced refetch
const debouncedRefetch = debounce(() => {
  refetch();
}, 300); // 300ms delay

const isDevelopment = computed(() => import.meta.env.DEV);

const getCategoryClassForTool = (tool: IntegratedTool): string => {
  return getCategoryClass(getToolCategory(tool));
};

const copyText = (text: string | undefined) => {
  if (text) {
    navigator.clipboard.writeText(text);
  }
};

const formatUrlType = (type: string): string => {
  if (type === 'DASHBOARD') return 'Dashboard';
  if (type.includes('API')) return type.replace('Api', 'API');
  return type.toLowerCase()
    .split('_')
    .map((word, index) => 
      index === 0 
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
};
</script>

<style scoped>
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

.tools-dashboard {
  padding: 2rem;
}

.page-title {
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
  color: white !important;
}

.tool-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  height: 100%;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--card-shadow);
}

.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.tool-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color-secondary);
}

.tool-logo {
  height: 2.5rem;
  width: 8rem;
  object-fit: contain;
  object-position: right;
}

.tool-description {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.error-message {
  text-align: center;
  color: var(--red-500);
  padding: 2rem;
}

.fallback-icon {
  opacity: 0.5;
  filter: grayscale(100%);
  width: 2.5rem;
  height: 2.5rem;
}

.credentials {
  margin-top: 1.5rem;
}

.p-inputgroup {
  display: flex;
  align-items: stretch;
  margin-bottom: 0.75rem;
}

.p-inputgroup:last-child {
  margin-bottom: 0;
}

.p-inputgroup .p-inputgroup-addon {
  padding: 0.5rem 1rem;
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
  width: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.75rem;
  text-transform: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.p-inputgroup input {
  flex: 1;
  border: 1px solid var(--surface-border);
  padding: 0.5rem;
  background: var(--surface-section);
  color: var(--text-color);
}

.p-button.p-button-icon-only {
  width: 2.5rem;
  padding: 0;
}

.p-button.p-button-icon-only i {
  font-size: 1rem;
}

/* Prevent card click when interacting with inputs */
.credentials * {
  cursor: default;
}

.tool-category {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: auto;
  margin-right: 1rem;
}

.tool-card-inner {
  height: 100%;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  background: var(--surface-card);
}

.integrated-tool {
  border-left: 4px solid var(--primary-color);
  padding-left: 1.25rem;
}

.localhost-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-label {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

/* Center the clear icon */
:deep(.p-dropdown .p-dropdown-clear-icon) {
  position: absolute;
  top: 50%;
  margin-top: -0.5rem;
  right: 2.5rem;
}

.tool-actions {
  display: flex;
  gap: var(--of-spacing-sm);
}

.tool-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
}

.tool-action:hover {
  background: var(--surface-hover);
}

.tool-action i {
  font-size: 0.875rem;
}

:deep(.p-dropdown) {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  transition: border-color 0.2s;
  height: 42px;
  min-width: 200px;
}

:deep(.p-dropdown:hover) {
  border-color: var(--of-primary);
}

:deep(.p-dropdown:not(.p-disabled).p-focus) {
  border-color: var(--of-primary);
  box-shadow: 0 0 0 1px var(--of-primary);
}

:deep(.p-dropdown-panel) {
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-radius: var(--of-card-radius);
}

:deep(.p-dropdown-item) {
  padding: var(--of-spacing-sm) var(--of-spacing-md);
  color: var(--text-color);
  transition: background-color 0.2s;
}

:deep(.p-dropdown-item:hover) {
  background: var(--surface-hover);
}

/* Dropdown styles */
:deep(.p-dropdown) {
  height: 42px;
  min-width: 200px;
}

:deep(.p-dropdown .p-dropdown-label) {
  display: flex;
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
}

:deep(.p-dropdown .p-dropdown-clear-icon) {
  position: absolute;
  right: 2.5rem;
  top: 50%;
  margin-top: -0.5rem;
  color: var(--text-color-secondary);
  cursor: pointer;
  font-size: 1rem;
}

:deep(.p-dropdown .p-dropdown-clear-icon:hover) {
  color: var(--text-color);
}

:deep(.p-dropdown:not(.p-disabled).p-focus) {
  border-color: var(--of-primary);
  box-shadow: 0 0 0 1px var(--of-primary);
}

:deep(.p-dropdown-panel) {
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-radius: var(--of-card-radius);
}

:deep(.p-dropdown-item) {
  padding: var(--of-spacing-sm) var(--of-spacing-md);
  color: var(--text-color);
  transition: background-color 0.2s;
}

:deep(.p-dropdown-item:hover) {
  background: var(--surface-hover);
}

/* Action button styles */
.tool-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
}

.tool-action:hover {
  background: var(--surface-hover);
}

.tool-action i {
  font-size: 0.875rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 2rem;
}

.tool-category[data-category="Interface"] {
  background: var(--yellow-500);
  color: var(--yellow-900);
}

.tool-category[data-category="Application"] {
  background: var(--bluegray-700);
  color: white;
}

.tool-category[data-category="Configuration"] {
  background: var(--yellow-600);
  color: white;
}

.tool-category[data-category="Streaming"] {
  background: var(--blue-600);
  color: white;
}

.tool-category[data-category="Data Integration"] {
  background: var(--blue-800);
  color: white;
}

.tool-category[data-category="Datasource"] {
  background: var(--gray-700);
  color: white;
}

.tool-category[data-category="Integrated Tools"] {
  background: var(--yellow-400);
  color: var(--yellow-900);
}

.tool-category[data-category="Integrated Tools Datasource"] {
  background: var(--gray-500);
  color: white;
}

.tool-category[data-category="Monitoring"] {
  background: var(--bluegray-500);
  color: white;
}

/* Update the card border color based on category */
.tool-card-inner {
  height: 100%;
  padding: 1.5rem;
  border-radius: var(--border-radius);
  background: var(--surface-card);
}

.tool-card-inner.interface {
  border-left: 4px solid var(--yellow-500);
}

.tool-card-inner.application {
  border-left: 4px solid var(--bluegray-700);
}

.tool-card-inner.config {
  border-left: 4px solid var(--yellow-600);
}

.tool-card-inner.streaming {
  border-left: 4px solid var(--blue-600);
}

.tool-card-inner.integration {
  border-left: 4px solid var(--blue-800);
}

.tool-card-inner.datasource {
  border-left: 4px solid var(--gray-700);
}

.tool-card-inner.integrated-tools {
  border-left: 4px solid var(--yellow-400);
}

.tool-card-inner.integrated-tools-datasource {
  border-left: 4px solid var(--gray-500);
}

.tool-card-inner.monitoring {
  border-left: 4px solid var(--bluegray-500);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>                                        