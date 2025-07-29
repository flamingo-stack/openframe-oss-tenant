# Fleet MDM SDK

Independent Java SDK for Fleet MDM REST API integration.

## Features

- Get list of all hosts from Fleet MDM
- Get single host by ID
- Lightweight and dependency-free (only Jackson for JSON processing)
- Comprehensive unit tests
- Java 17+ compatible

## Installation

### Maven

Add the SDK to your project dependencies:

```xml
<dependency>
    <groupId>com.openframe</groupId>
    <artifactId>fleet-mdm-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Manual Installation

1. Clone this repository
2. Build the SDK: `mvn clean install`
3. Add the generated JAR to your project

## Usage

### Basic Example

```java
import com.openframe.sdk.fleetmdm.FleetMdmClient;
import com.openframe.sdk.fleetmdm.model.Host;
import java.util.List;

// Initialize client
FleetMdmClient client = new FleetMdmClient(
    "https://fleet.example.com", 
    "your-api-token"
);

// Get all hosts
List<Host> hosts = client.getHosts();
for (Host host : hosts) {
    System.out.println("Host: " + host.getHostname() + 
                      " (Platform: " + host.getPlatform() + ")");
}

// Get specific host by ID
Host host = client.getHostById(1L);
if (host != null) {
    System.out.println("Found host: " + host.getHostname());
}
```

### Host Model

The `Host` model includes all major fields from Fleet MDM API:

```java
Host host = client.getHostById(1L);
System.out.println("ID: " + host.getId());
System.out.println("Hostname: " + host.getHostname());
System.out.println("Platform: " + host.getPlatform());
System.out.println("OS Version: " + host.getOsVersion());
System.out.println("Primary IP: " + host.getPrimaryIp());
System.out.println("Team: " + host.getTeamName());
```

## Development

### Building

```bash
mvn clean install
```

### Running Tests

```bash
mvn test
```

## API Reference

### FleetMdmClient

Main client class for Fleet MDM API integration.

#### Constructor

```java
FleetMdmClient(String baseUrl, String apiToken)
```

- `baseUrl` - Base URL of Fleet MDM instance (e.g., "https://fleet.example.com")
- `apiToken` - API token for authentication

#### Methods

- `List<Host> getHosts()` - Get all hosts
- `Host getHostById(long id)` - Get host by ID (returns null if not found)

### Host Model

Represents a host/device in Fleet MDM.

#### Fields

- `id` (Long) - Host ID
- `hostname` (String) - Host hostname
- `uuid` (String) - Host UUID
- `platform` (String) - Platform (darwin, windows, linux)
- `osVersion` (String) - Operating system version
- `build` (String) - OS build
- `cpuBrand` (String) - CPU brand
- `hardwareVendor` (String) - Hardware vendor
- `hardwareModel` (String) - Hardware model
- `hardwareSerial` (String) - Hardware serial
- `primaryIp` (String) - Primary IP address
- `primaryMac` (String) - Primary MAC address
- `teamId` (Long) - Team ID
- `teamName` (String) - Team name
- `seenTime` (String) - Last seen time
- `createdAt` (String) - Creation time
- `updatedAt` (String) - Last update time

## Error Handling

The SDK throws `RuntimeException` for API errors (non-200 status codes). For 404 errors when getting a host by ID, the method returns `null`.

## Development Plan

See [TASKS.md](./TASKS.md) for current development status and planned features.
