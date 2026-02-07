# NATS Listeners

## Overview
Listeners in this module consume NATS and JetStream events to keep machine and tool state synchronized in near real-time.

---

## ClientConnectionListener

### Events
- Machine connected
- Machine disconnected

### Responsibilities
- Updates machine online/offline state
- Acts as fallback when heartbeat events are unavailable

---

## MachineHeartbeatListener

### Events
- `machine.*.heartbeat`

### Responsibilities
- Processes periodic heartbeats
- Updates last-seen timestamps

---

## InstalledAgentListener

### Stream
- `INSTALLED_AGENTS`

### Responsibilities
- Tracks agents installed on machines
- Handles retries and redelivery via JetStream

### Reliability
- Explicit acknowledgements
- Configurable max delivery attempts

---

## ToolConnectionListener

### Stream
- `TOOL_CONNECTIONS`

### Responsibilities
- Tracks tool-to-machine relationships
- Normalizes tool identifiers

### Reliability
- Durable JetStream consumer
- Delivery groups for horizontal scaling
