<template>
  <div class="monitoring-page">
    <h1>Monitoring and Tools</h1>

    <section class="mb-4">
      <h2>System Overview</h2>
      <div class="grid">
        <!-- Services Health Status -->
        <div class="col-12 mb-3">
          <div class="tool-card">
            <div class="grid">
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=11&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=12&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=13&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=14&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=30&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=16&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=17&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
              <div class="col-12 md:col-3">
                <iframe
                  src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=18&theme=light"
                  width="100%"
                  height="100"
                  frameborder="0"
                ></iframe>
              </div>
            </div>
          </div>
        </div>

        <!-- Memory and CPU Usage -->
        <div class="col-12 md:col-6 mb-3">
          <div class="tool-card">
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=26&theme=light"
              width="100%"
              height="300"
              frameborder="0"
            ></iframe>
          </div>
        </div>

        <div class="col-12 md:col-6 mb-3">
          <div class="tool-card">
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=20&theme=light"
              width="100%"
              height="300"
              frameborder="0"
            ></iframe>
          </div>
        </div>

        <!-- API Performance -->
        <div class="col-12 md:col-6 mb-3">
          <div class="tool-card">
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=28&theme=light"
              width="100%"
              height="300"
              frameborder="0"
            ></iframe>
          </div>
        </div>

        <!-- Error Rates -->
        <div class="col-12 md:col-6 mb-3">
          <div class="tool-card">
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=24&theme=light"
              width="100%"
              height="300"
              frameborder="0"
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
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=20&theme=light"
              width="100%"
              height="200"
              frameborder="0"
            ></iframe>
          </div>
        </div>

        <div class="col-12 md:col-3 mb-3">
          <div class="tool-card">
            <h3>Memory Usage</h3>
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=26&theme=light"
              width="100%"
              height="200"
              frameborder="0"
            ></iframe>
          </div>
        </div>

        <div class="col-12 md:col-3 mb-3">
          <div class="tool-card">
            <h3>Network Traffic</h3>
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=30&theme=light"
              width="100%"
              height="200"
              frameborder="0"
            ></iframe>
          </div>
        </div>

        <div class="col-12 md:col-3 mb-3">
          <div class="tool-card">
            <h3>System Load</h3>
            <iframe
              src="http://localhost:3000/d-solo/home/openframe-overview?orgId=1&panelId=29&theme=light"
              width="100%"
              height="200"
              frameborder="0"
            ></iframe>
          </div>
        </div>
      </div>
    </section>

    <!-- Integrated Tools Section -->
    <section class="mb-4">
      <h2 class="mb-3">Integrated Tools</h2>
      <div class="grid">
        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Authentik</h3>
              <img :src="authentikLogo" alt="Authentik" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="5001" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('5001')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:5001" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:5001')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:5001')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">User</span>
                <input class="p-inputtext p-component" readonly value="akadmin@openframe.local" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('akadmin@openframe.local')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">Pass</span>
                <Password v-model="authentikPassword" :feedback="false" readonly inputClass="w-full" toggleMask />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('openframe123!')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Fleet MDM</h3>
              <img :src="fleetLogo" alt="Fleet" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8070" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8070')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:8070" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:8070')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:8070')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">User</span>
                <input class="p-inputtext p-component" readonly value="admin@openframe.local" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('admin@openframe.local')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">Pass</span>
                <Password v-model="fleetPassword" :feedback="false" readonly inputClass="w-full" toggleMask />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('openframe123!')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>RustDesk</h3>
              <img :src="rustdeskLogo" alt="RustDesk" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">ID</span>
                <input class="p-inputtext p-component" readonly value="71832463748716346" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('71832463748716346')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="21115-21119" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('21115-21119')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Internal Services Section -->
    <section class="mb-4">
      <h2 class="mb-3">Internal Services</h2>
      <div class="grid">
        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Config Server</h3>
              <img :src="openframeLogo" alt="Config Server" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8888" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8888')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:8888" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:8888')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:8888')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>API Service</h3>
              <img :src="openframeLogo" alt="API Service" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8090" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8090')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:8090" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:8090')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:8090')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Stream Service</h3>
              <img :src="openframeLogo" alt="Stream Service" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8082" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8082')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:8082" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:8082')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:8082')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Internal Infrastructure Section -->
    <section>
      <h2 class="mb-3">Internal Infrastructure</h2>
      <div class="grid">
        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Grafana</h3>
              <img :src="grafanaLogo" alt="Grafana" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="3000" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('3000')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:3000" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:3000')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:3000')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">User</span>
                <input class="p-inputtext p-component" readonly value="openframe" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('openframe')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">Pass</span>
                <Password v-model="grafanaPassword" :feedback="false" readonly inputClass="w-full" toggleMask />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('password123456789')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Prometheus</h3>
              <img :src="prometheusLogo" alt="Prometheus" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="9090" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('9090')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:9090" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:9090')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:9090')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Kafka UI</h3>
              <img :src="kafkaLogo" alt="Kafka UI" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8080" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8080')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:8080" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:8080')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:8080')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Mongo Express</h3>
              <img :src="mongoExpressLogo" alt="Mongo Express" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8081" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8081')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:8081" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:8081')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:8081')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>NiFi</h3>
              <img :src="nifiLogo" alt="NiFi" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="8443" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('8443')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="https://localhost:8443" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('https://localhost:8443')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('https://localhost:8443')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">User</span>
                <input class="p-inputtext p-component" readonly value="openframe" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('openframe')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon">Pass</span>
                <Password v-model="nifiPassword" :feedback="false" readonly inputClass="w-full" toggleMask />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('password123456789')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 xl:col-4 mb-3">
          <div class="tool-card">
            <div class="tool-header">
              <h3>Apache Pinot</h3>
              <img :src="pinotLogo" alt="Pinot" class="tool-logo" />
            </div>
            <div class="credentials">
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">Port</span>
                <input class="p-inputtext p-component" readonly value="9000" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('9000')">
                  <i class="pi pi-copy"></i>
                </button>
              </div>
              <div class="p-inputgroup mb-2">
                <span class="p-inputgroup-addon">URL</span>
                <input class="p-inputtext p-component" readonly value="http://localhost:9000" />
                <button class="p-button p-component p-button-icon-only" @click="copyToClipboard('http://localhost:9000')">
                  <i class="pi pi-copy"></i>
                </button>
                <button class="p-button p-component p-button-icon-only" @click="openInNewTab('http://localhost:9000')">
                  <i class="pi pi-external-link"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Password from 'primevue/password'

// Import logos
import authentikLogo from '@/assets/authentik-logo.svg'
import fleetLogo from '@/assets/fleet-logo.svg'
import rustdeskLogo from '@/assets/rustdesk-logo.svg'
import grafanaLogo from '@/assets/grafana-logo.svg'
import prometheusLogo from '@/assets/prometheus-logo.svg'
import kafkaLogo from '@/assets/kafka-logo.svg'
import mongoExpressLogo from '@/assets/mongo-express-logo.svg'
import nifiLogo from '@/assets/nifi-logo.svg'
import openframeLogo from '@/assets/openframe-logo.svg'
import pinotLogo from '@/assets/pinot-logo.svg'

const authentikPassword = ref('openframe123!')
const fleetPassword = ref('openframe123!')
const grafanaPassword = ref('password123456789')
const nifiPassword = ref('password123456789')

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}

const openInNewTab = (url: string) => {
  window.open(url, '_blank')
}
</script>

<style scoped>
.monitoring-page {
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
}

.tool-card {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  height: 100%;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.tool-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.tool-logo {
  height: 2.5rem;
  width: 8rem;
  object-fit: contain;
  object-position: right;
}

:deep(.p-password-input) {
  width: 100%;
}

:deep(.p-password) {
  width: 100%;
  display: flex;
}
</style> 