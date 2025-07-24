# Rust Client Development Guide

The OpenFrame Rust client is a cross-platform system agent that provides monitoring, management, and automation capabilities. It integrates with the OpenFrame platform through secure authentication and WebSocket connections.

## Architecture Overview

The Rust client is designed as both a command-line application and a system service with the following key characteristics:

- **Cross-platform support**: Windows, macOS, and Linux
- **Service integration**: Can run as a system service on all platforms
- **Async runtime**: Uses Tokio for high-performance I/O operations
- **Auto-update**: Integrated with Velopack for seamless updates
- **Secure communication**: TLS-encrypted communication with the platform

## Project Structure

```
client/
├── src/
│   ├── bin/                     # Binary executables
│   ├── clients/                 # HTTP client implementations
│   │   ├── auth_client.rs       # Authentication client
│   │   ├── registration_client.rs # Registration client
│   │   └── mod.rs
│   ├── config.rs                # Configuration management
│   ├── lib.rs                   # Library interface
│   ├── logging/                 # Logging infrastructure
│   │   ├── metrics.rs           # Metrics collection
│   │   ├── platform.rs          # Platform-specific logging
│   │   ├── shipping.rs          # Log shipping
│   │   └── mod.rs
│   ├── main.rs                  # CLI entry point
│   ├── models/                  # Data models
│   ├── monitoring/              # System monitoring
│   ├── platform/                # Platform-specific code
│   ├── service.rs               # Service lifecycle management
│   ├── services/                # Business logic services
│   └── system.rs                # System information collection
├── config/
│   └── agent.toml               # Default configuration
├── Cargo.toml                   # Project configuration
└── Cargo.lock                   # Dependency lock file
```

## Key Dependencies

- **tokio**: Async runtime for I/O operations
- **serde**: Serialization/deserialization
- **reqwest**: HTTP client with TLS support
- **tracing**: Structured logging
- **config**: Configuration management
- **sysinfo**: System information collection
- **service-manager**: Cross-platform service management
- **velopack**: Auto-update functionality

## Development Setup

### Prerequisites

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### Building the Client

```bash
# Navigate to client directory
cd client

# Build in development mode
cargo build

# Build optimized release
cargo build --release

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo run
```

### Platform-Specific Build

```bash
# Build for specific target
cargo build --target x86_64-pc-windows-gnu     # Windows
cargo build --target x86_64-apple-darwin       # macOS Intel
cargo build --target aarch64-apple-darwin      # macOS Apple Silicon
cargo build --target x86_64-unknown-linux-gnu  # Linux
```

## Configuration

The agent uses a TOML configuration file located at `config/agent.toml`:

```toml
[agent]
name = "openframe-agent"
version = "0.1.0"
environment = "development"

[server]
base_url = "https://api.openframe.local"
timeout = 30
retry_attempts = 3

[authentication]
method = "token"
token_refresh_threshold = 300

[logging]
level = "info"
format = "json"
output = "stdout"

[monitoring]
metrics_interval = 60
system_info_interval = 300

[service]
auto_start = true
restart_policy = "always"
```

## Service Management

The client can operate as a system service across all supported platforms:

### Installation as Service

```bash
# Install as system service
cargo run -- install

# Start the service
cargo run -- start

# Stop the service
cargo run -- stop

# Uninstall the service
cargo run -- uninstall

# Check service status
cargo run -- status
```

### Manual Operation

```bash
# Run in foreground mode
cargo run -- run

# Run with debug logging
RUST_LOG=debug cargo run -- run

# Run with custom config
cargo run -- run --config /path/to/config.toml
```

## Key Components

### Authentication Service

The authentication service handles secure communication with the OpenFrame platform:

```rust
// Example usage
let auth_service = AuthService::new(config.clone()).await?;
let token = auth_service.authenticate().await?;
```

### System Monitoring

System monitoring collects and reports various system metrics:

```rust
// System information collection
let system_info = SystemInfo::collect();
let metrics = system_info.to_metrics();
```

### Service Management

Cross-platform service lifecycle management:

```rust
// Service operations
let service = ServiceManager::new("openframe-agent");
service.install().await?;
service.start().await?;
```

## Development Workflow

### Adding New Features

1. **Create feature branch**:
   ```bash
   git checkout -b feature/new-monitoring-capability
   ```

2. **Implement the feature**:
   - Add necessary dependencies to `Cargo.toml`
   - Implement core logic in appropriate module
   - Add comprehensive error handling
   - Include logging and metrics

3. **Write tests**:
   ```bash
   # Unit tests
   cargo test

   # Integration tests
   cargo test --test integration_tests
   ```

4. **Check code quality**:
   ```bash
   # Format code
   cargo fmt

   # Run clippy for lints
   cargo clippy

   # Check for security issues
   cargo audit
   ```

### Testing

The project includes comprehensive testing:

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_authentication

# Run tests with coverage
cargo tarpaulin --out Html
```

### Debugging

Use the following approaches for debugging:

```bash
# Enable debug logging
RUST_LOG=debug cargo run

# Use debugger
rust-gdb target/debug/openframe
```

## Integration with OpenFrame Platform

### Authentication Flow

1. **Initial Registration**: Agent registers with the platform using a shared secret
2. **Token Exchange**: Receives JWT token for ongoing authentication
3. **Token Refresh**: Automatically refreshes tokens before expiration
4. **Secure Communication**: All API calls use bearer token authentication

### Data Collection and Reporting

1. **System Metrics**: Collects CPU, memory, disk, and network statistics
2. **Process Information**: Reports running processes and services
3. **Security Events**: Monitors for security-relevant system events
4. **Log Shipping**: Forwards application and system logs to the platform

### WebSocket Communication

Real-time communication with the platform:

```rust
// WebSocket connection for real-time commands
let ws_client = WebSocketClient::connect(&config.websocket_url).await?;
ws_client.handle_commands().await?;
```

## Deployment

### Creating Release Builds

```bash
# Create optimized release build
cargo build --release

# Build for multiple targets
./scripts/build-all-targets.sh

# Create distributable packages
cargo run --bin package-builder
```

### Auto-Update Integration

The client supports automatic updates through Velopack:

```rust
// Check for updates
let updater = UpdateManager::new()?;
if let Some(update) = updater.check_for_updates().await? {
    updater.apply_update(update).await?;
}
```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Clean and rebuild
   cargo clean
   cargo build
   ```

2. **Permission Issues**:
   - Ensure proper permissions for service installation
   - Run with appropriate privileges on Windows/Linux

3. **Network Connectivity**:
   - Check firewall settings
   - Verify TLS certificate configuration
   - Test connectivity to OpenFrame platform

4. **Service Issues**:
   ```bash
   # Check service logs
   journalctl -u openframe-agent  # Linux
   Get-EventLog -LogName Application -Source "openframe-agent"  # Windows
   ```

### Logging and Diagnostics

The client provides comprehensive logging:

```bash
# Enable detailed logging
RUST_LOG=openframe=debug,reqwest=info cargo run

# Log to file
RUST_LOG=info cargo run 2>&1 | tee agent.log
```

## Contributing

When contributing to the Rust client:

1. Follow Rust naming conventions (snake_case)
2. Use proper error handling with `anyhow` and `thiserror`
3. Include comprehensive documentation
4. Add unit and integration tests
5. Ensure cross-platform compatibility
6. Use async/await patterns consistently

## Performance Considerations

- **Memory Usage**: Monitor memory consumption, especially for long-running services
- **CPU Impact**: Ensure monitoring doesn't significantly impact system performance
- **Network Efficiency**: Batch operations and use compression where appropriate
- **Battery Life**: Consider power consumption on mobile/laptop devices

## Security Best Practices

- **Credential Storage**: Use platform-specific secure storage for sensitive data
- **Communication**: Always use TLS for network communication
- **Permissions**: Request minimum necessary permissions
- **Updates**: Keep dependencies up to date
- **Validation**: Validate all input from external sources

## Next Steps

- [System Architecture](../architecture/overview.md)
- [API Integration](../api/integration.md)
- [Security Guidelines](../architecture/security.md)
- [Deployment Guide](../deployment/deployment.md)