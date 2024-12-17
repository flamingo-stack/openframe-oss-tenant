<template>
  <div class="tools-dashboard">
    <h1>Tools</h1>
    
    <div class="filters mb-4 flex align-items-center gap-3">
      <div class="flex-1">
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
          v-model="filter.type"
          :options="Object.keys(sectionMap).sort()"
          placeholder="Filter by type"
          @change="refetch()"
          class="w-full"
        />
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
            class="col-12 md:col-6 xl:col-4 mb-3"
          >
            <div class="tool-card" @click="openTool(tool)">
              <div class="tool-header">
                <h3>{{ tool.name }}</h3>
                <img 
                  :src="getToolIcon(tool)" 
                  :alt="tool.name" 
                  class="tool-logo"
                  @error="onImageError"
                />
              </div>
              <p class="tool-description">{{ tool.description }}</p>
              <div class="credentials">
                <div class="p-inputgroup mb-2">
                  <span class="p-inputgroup-addon">URL</span>
                  <input class="p-inputtext p-component" readonly :value="tool.url" />
                  <button class="p-button p-component p-button-icon-only" @click.stop="copyToClipboard(tool.url)">
                    <i class="pi pi-copy"></i>
                  </button>
                  <button class="p-button p-component p-button-icon-only" @click.stop="openInNewTab(tool.url)">
                    <i class="pi pi-external-link"></i>
                  </button>
                </div>
                <div v-if="tool.port" class="p-inputgroup mb-2">
                  <span class="p-inputgroup-addon">Port</span>
                  <input class="p-inputtext p-component" readonly :value="tool.port" />
                  <button class="p-button p-component p-button-icon-only" @click.stop="copyToClipboard(tool.port)">
                    <i class="pi pi-copy"></i>
                  </button>
                </div>
                <div v-if="tool?.credentials?.username" class="p-inputgroup mb-2">
                  <span class="p-inputgroup-addon">User</span>
                  <input class="p-inputtext p-component" readonly :value="tool?.credentials?.username" />
                  <button class="p-button p-component p-button-icon-only" @click.stop="copyToClipboard(tool?.credentials?.username)">
                    <i class="pi pi-copy"></i>
                  </button>
                </div>
                <div v-if="tool.credentials?.password" class="p-inputgroup">
                  <span class="p-inputgroup-addon">Pass</span>
                  <Password v-model="tool.credentials.password" :feedback="false" readonly inputClass="w-full" toggleMask />
                  <button class="p-button p-component p-button-icon-only" @click.stop="copyToClipboard(tool.credentials.password)">
                    <i class="pi pi-copy"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useQuery } from '@vue/apollo-composable';
import gql from 'graphql-tag';
import type { IntegratedTool } from '../types/IntegratedTool';
import Password from 'primevue/password'
import { ApolloError } from '@apollo/client/errors';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';

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
import openframeLogo from '@/assets/openframe-logo.svg'
import pinotLogo from '@/assets/pinot-logo.svg'
import kibanaLogo from '@/assets/kibana-logo.svg'
import redisLogo from '@/assets/redis-logo.svg'
import cassandraLogo from '@/assets/cassandra-logo.svg'
import zookeeperLogo from '@/assets/zookeeper-logo.svg'

const INTEGRATED_TOOLS_QUERY = gql`
  query GetIntegratedTools($filter: ToolFilter) {
    integratedTools(filter: $filter) {
      id
      name
      description
      icon
      url
      enabled
      type
      category
      port
      credentials {
        username
        password
      }
    }
  }
`;

// Add filter state
const filter = ref({
  enabled: true,
  type: null as string | null,
  category: null as string | null,
  search: '' as string
});

// Update query to use filter
const { result, loading, error, refetch } = useQuery(
  INTEGRATED_TOOLS_QUERY, 
  () => ({
    filter: {
      enabled: filter.value.enabled,
      type: filter.value.type,
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
  'mongo-express': mongoExpressLogo,
  'kafka-primary': kafkaLogo,
  'kibana': kibanaLogo,
  'fleet': fleetLogo,
  'authentik': authentikLogo,
  'prometheus-primary': prometheusLogo,
  'nifi-primary': nifiLogo,
  'rustdesk': rustdeskLogo,
  'pinot-controller': pinotLogo,
  'pinot-broker': pinotLogo,
  'pinot-server': pinotLogo,
  'loki-primary': lokiLogo,
  'redis-primary': redisLogo,
  'cassandra-primary': cassandraLogo,
  'zookeeper-primary': zookeeperLogo
};

// Move sectionMap outside of getToolSection
const sectionMap: Record<string, string> = {
  'Monitoring': 'Monitoring & Metrics',
  'Database': 'Databases',
  'Message Broker': 'Message Queues',
  'SSO': 'Security & Access',
  'Data Integration': 'Data Streaming',
  'MDM': 'Device Management',
  'Analytics': 'Analytics',
  'Cache': 'Caching',
  'Log Aggregation': 'Logging',
  'Coordinator': 'Service Discovery'
};

const getToolSection = (tool: IntegratedTool): string => {
  return tool.category ? sectionMap[tool.category] : 'Other';
};

const groupedTools = computed(() => {
  const grouped: Record<string, IntegratedTool[]> = {};
  tools.value.forEach(tool => {
    const section = getToolSection(tool);
    if (!grouped[section]) {
      grouped[section] = [];
    }
    grouped[section].push(tool);
  });
  return grouped;
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
    tools.value = newResult.integratedTools.filter((tool: IntegratedTool) => tool.enabled);
  }
}, { immediate: true });

const getToolIcon = (tool: IntegratedTool): string => {
  console.log('Tool ID:', tool.id, 'Logo:', logoMap[tool.id]); // Debug log
  return logoMap[tool.id] || '';
};

const onImageError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  // Use a simpler default icon
  target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTEgMTVoLTJ2LTZoMnY2em0wLThoLTJWN2gydjJ6Ii8+PC9zdmc+';
  // Add a class to help with styling the fallback icon
  target.classList.add('fallback-icon');
};

const openTool = (tool: IntegratedTool) => {
  if (tool.url) {
    window.open(tool.url, '_blank');
  }
};

const copyToClipboard = (text: string | undefined) => {
  if (text) {
    navigator.clipboard.writeText(text)
  }
};

const openInNewTab = (url: string | undefined) => {
  if (url) {
    window.open(url, '_blank')
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
</script>

<style scoped>
.tools-dashboard {
  padding: 2rem;
}

h1 {
  margin-bottom: 2rem;
  font-size: 2rem;
  font-weight: 600;
  color: #00E5BE;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
  padding-left: 1rem;
}

.tool-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  height: 100%;
  cursor: pointer;
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
  color: var(--text-color);
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
  background: white;
  border: 1px solid var(--surface-border);
  width: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--text-color);
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
</style> 