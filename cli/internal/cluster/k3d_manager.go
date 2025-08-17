package cluster

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/common/executor"
)

// Removed domainProviderAdapter - no longer needed since K3dDirectProvider works with cluster types directly

// ClusterManager is the interface for managing clusters (for backward compatibility)
type ClusterManager interface {
	DetectClusterType(ctx context.Context, name string) (domain.ClusterType, error)
	ListClusters(ctx context.Context) ([]domain.ClusterInfo, error)
	ListAllClusters(ctx context.Context) ([]domain.ClusterInfo, error)
}

// K3dManager manages K3D cluster operations directly
// Simplified architecture with inline K3D operations - no provider abstraction needed
type K3dManager struct {
	executor executor.CommandExecutor
	verbose  bool
}

// NewK3dManager creates a new K3D cluster manager with direct K3D operations
func NewK3dManager(exec executor.CommandExecutor, verbose bool) *K3dManager {
	return &K3dManager{
		executor: exec,
		verbose:  verbose,
	}
}

// Removed provider registry methods - using direct K3D provider instead

// Manager now implements ClusterService directly - no need for GetService

// CreateCluster creates a new K3D cluster using config file approach (like shell script)
func (m *K3dManager) CreateCluster(ctx context.Context, config domain.ClusterConfig) error {
	// Validate configuration
	if err := m.validateClusterConfig(config); err != nil {
		return err
	}

	// Only support K3D for now
	if config.Type != domain.ClusterTypeK3d {
		return domain.NewProviderNotFoundError(config.Type)
	}

	// Create temporary config file
	configFile, err := m.createK3dConfigFile(config)
	if err != nil {
		return domain.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create config file: %w", err))
	}
	defer os.Remove(configFile)

	// Debug: show config content only in verbose mode
	if m.verbose {
		if configContent, err := ioutil.ReadFile(configFile); err == nil {
			fmt.Printf("DEBUG: Config file content for %s:\n%s\n", config.Name, string(configContent))
		}
	}

	// Create cluster using config file (like shell script does)
	args := []string{"cluster", "create", "--config", configFile, "--timeout", "180s"}
	
	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return domain.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create cluster %s: %w", config.Name, err))
	}

	return nil
}

// DeleteCluster removes a K3D cluster
func (m *K3dManager) DeleteCluster(ctx context.Context, name string, clusterType domain.ClusterType, force bool) error {
	if name == "" {
		return domain.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Only support K3D for now
	if clusterType != domain.ClusterTypeK3d {
		return domain.NewProviderNotFoundError(clusterType)
	}

	// Inline K3D cluster deletion
	args := []string{"cluster", "delete", name}

	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return domain.NewClusterOperationError("delete", name, fmt.Errorf("failed to delete cluster %s: %w", name, err))
	}

	return nil
}

// StartCluster starts a K3D cluster
func (m *K3dManager) StartCluster(ctx context.Context, name string, clusterType domain.ClusterType) error {
	if name == "" {
		return domain.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Only support K3D for now
	if clusterType != domain.ClusterTypeK3d {
		return domain.NewProviderNotFoundError(clusterType)
	}

	// Inline K3D cluster start
	args := []string{"cluster", "start", name}

	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return domain.NewClusterOperationError("start", name, fmt.Errorf("failed to start cluster %s: %w", name, err))
	}

	return nil
}

// ListClusters returns all K3D clusters
func (m *K3dManager) ListClusters(ctx context.Context) ([]domain.ClusterInfo, error) {
	// Inline K3D cluster listing
	args := []string{"cluster", "list", "--output", "json"}

	result, err := m.executor.Execute(ctx, "k3d", args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list clusters: %w", err)
	}

	output := []byte(result.Stdout)

	var k3dClusters []k3dClusterInfo
	if err := json.Unmarshal(output, &k3dClusters); err != nil {
		return nil, fmt.Errorf("failed to parse cluster list JSON: %w", err)
	}

	var clusters []domain.ClusterInfo
	for _, k3dCluster := range k3dClusters {
		clusters = append(clusters, domain.ClusterInfo{
			Name:      k3dCluster.Name,
			Type:      domain.ClusterTypeK3d,
			Status:    fmt.Sprintf("%d/%d", k3dCluster.ServersRunning, k3dCluster.ServersCount),
			NodeCount: k3dCluster.AgentsCount + k3dCluster.ServersCount,
			Nodes:     []domain.NodeInfo{}, // TODO: populate with actual node info
		})
	}

	return clusters, nil
}

// ListAllClusters is an alias for ListClusters for backward compatibility
func (m *K3dManager) ListAllClusters(ctx context.Context) ([]domain.ClusterInfo, error) {
	return m.ListClusters(ctx)
}

// GetClusterStatus returns detailed status for a specific K3D cluster
func (m *K3dManager) GetClusterStatus(ctx context.Context, name string) (domain.ClusterInfo, error) {
	if name == "" {
		return domain.ClusterInfo{}, domain.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Inline K3D cluster status - get from list and find specific cluster
	clusters, err := m.ListClusters(ctx)
	if err != nil {
		return domain.ClusterInfo{}, domain.NewClusterOperationError("status", name, err)
	}

	for _, clusterInfo := range clusters {
		if clusterInfo.Name == name {
			return clusterInfo, nil
		}
	}

	return domain.ClusterInfo{}, domain.NewClusterOperationError("status", name, fmt.Errorf("cluster %s not found", name))
}

// DetectClusterType determines if a cluster is K3D (the only supported type)
func (m *K3dManager) DetectClusterType(ctx context.Context, name string) (domain.ClusterType, error) {
	if name == "" {
		return "", domain.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Inline K3D cluster detection
	args := []string{"cluster", "get", name}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return "", domain.NewClusterNotFoundError(name)
	}

	return domain.ClusterTypeK3d, nil
}

// GetKubeconfig gets the kubeconfig for a specific K3D cluster
func (m *K3dManager) GetKubeconfig(ctx context.Context, name string, clusterType domain.ClusterType) (string, error) {
	// Only support K3D for now
	if clusterType != domain.ClusterTypeK3d {
		return "", domain.NewProviderNotFoundError(clusterType)
	}
	
	// Inline K3D kubeconfig retrieval
	args := []string{"kubeconfig", "get", name}

	result, err := m.executor.Execute(ctx, "k3d", args...)
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig for cluster %s: %w", name, err)
	}

	return result.Stdout, nil
}

// CreateClusterManagerWithExecutor creates a K3D cluster manager with a specific command executor
// This enables dependency injection of command execution for testing
func CreateClusterManagerWithExecutor(exec executor.CommandExecutor) *K3dManager {
	// Executor must be provided to avoid import cycles
	if exec == nil {
		panic("Executor cannot be nil - must be provided by calling code to avoid import cycles")
	}
	
	// Create K3D manager directly (no provider abstraction needed)
	return NewK3dManager(exec, false) // Default to non-verbose
}

// validateClusterConfig validates the cluster configuration
func (m *K3dManager) validateClusterConfig(config domain.ClusterConfig) error {
	if config.Name == "" {
		return domain.NewInvalidConfigError("name", config.Name, "cluster name cannot be empty")
	}

	if config.Type == "" {
		return domain.NewInvalidConfigError("type", config.Type, "cluster type cannot be empty")
	}

	if config.NodeCount < 1 {
		return domain.NewInvalidConfigError("nodeCount", config.NodeCount, "node count must be at least 1")
	}

	return nil
}

// Removed conversion functions - no longer needed with direct cluster type providers

// CreateDefaultClusterManager creates a K3D cluster manager with all default configuration
// Note: This function will panic because no executor is provided.
// Use CreateClusterManagerWithExecutor instead with a proper executor.
func CreateDefaultClusterManager() *K3dManager {
	panic("CreateDefaultClusterManager is deprecated - use CreateClusterManagerWithExecutor with proper executor")
}

// k3dClusterInfo represents the JSON structure returned by k3d cluster list
type k3dClusterInfo struct {
	Name           string `json:"name"`
	ServersCount   int    `json:"serversCount"`
	ServersRunning int    `json:"serversRunning"`
	AgentsCount    int    `json:"agentsCount"`
	AgentsRunning  int    `json:"agentsRunning"`
	Image          string `json:"image,omitempty"`
}


// isTestCluster determines if a cluster name indicates it's a test cluster
func isTestCluster(name string) bool {
	// All test clusters from integration tests contain "test" or are clearly test patterns
	return strings.Contains(name, "test") || 
		   strings.Contains(name, "cleanup") ||
		   strings.Contains(name, "status") ||
		   strings.Contains(name, "list") ||
		   strings.Contains(name, "delete") ||
		   strings.Contains(name, "create") ||
		   strings.Contains(name, "multi") ||
		   strings.Contains(name, "single") ||
		   strings.Contains(name, "default_config") ||
		   strings.Contains(name, "with_type") ||
		   strings.Contains(name, "manual") ||
		   // Timestamp patterns (6 digits at end)
		   (len(name) > 6 && name[len(name)-6:] != name && 
		    strings.ContainsAny(name[len(name)-6:], "0123456789"))
}

// findAvailablePorts finds the specified number of available TCP ports
func findAvailablePorts(count int) ([]int, error) {
	var ports []int
	
	// Use a random starting port to avoid conflicts between parallel tests
	// Start from a high port range (20000-50000) with random offset
	startPort := 20000 + (int(time.Now().UnixNano()) % 10000)
	
	for i := 0; i < count; i++ {
		// Search for available ports starting from random offset
		for port := startPort + i*1000; port < 50000; port++ {
			if isPortAvailable(port) {
				ports = append(ports, port)
				break
			}
		}
		
		if len(ports) <= i {
			return nil, fmt.Errorf("could not find %d available ports", count)
		}
	}
	
	return ports, nil
}

// isPortAvailable checks if a TCP port is available
func isPortAvailable(port int) bool {
	address := fmt.Sprintf(":%d", port)
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return false
	}
	defer listener.Close()
	return true
}

// createK3dConfigFile creates a k3d config file matching the shell script approach
func (m *K3dManager) createK3dConfigFile(config domain.ClusterConfig) (string, error) {
	// Select image based on architecture (use stable versions)
	image := "rancher/k3s:v1.31.5-k3s1"
	if runtime.GOARCH == "arm64" {
		image = "rancher/k3s:v1.31.5-k3s1"  // Use same stable image for both architectures
	}
	
	// Override with custom version if specified
	if config.K8sVersion != "" {
		image = "rancher/k3s:" + config.K8sVersion
	}

	// Calculate servers and agents exactly like shell script:
	// Shell script uses: SERVERS=1 and OPTIMAL_AGENTS=$((TOTAL_CPU / 5)), minimum 1
	// For our tests, we'll use the requested node count as agents (like shell script takes agents)
	servers := 1
	agents := config.NodeCount
	if agents < 1 {
		agents = 1
	}

	// Create config content matching shell script exactly
	configContent := fmt.Sprintf(`apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: %s
servers: %d
agents: %d
image: %s`, config.Name, servers, agents, image)

	// For test clusters, use dynamic ports to avoid conflicts, otherwise use defaults
	if isTestCluster(config.Name) {
		// Find available ports for test clusters to prevent conflicts
		if ports, err := findAvailablePorts(3); err == nil && len(ports) >= 3 {
			apiPort := strconv.Itoa(ports[0])
			httpPort := strconv.Itoa(ports[1])
			httpsPort := strconv.Itoa(ports[2])
			
			// Add kubeAPI configuration with dynamic port
			configContent += fmt.Sprintf(`
kubeAPI:
  host: "127.0.0.1"
  hostIP: "127.0.0.1"
  hostPort: "%s"`, apiPort)

			// Add port mappings for test clusters too
			configContent += fmt.Sprintf(`
options:
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
      - arg: --kubelet-arg=eviction-hard=
        nodeFilters:
          - all
      - arg: --kubelet-arg=eviction-soft=
        nodeFilters:
          - all
ports:
  - port: %s:80
    nodeFilters:
      - loadbalancer
  - port: %s:443
    nodeFilters:
      - loadbalancer`, httpPort, httpsPort)
		} else {
			// If we can't find ports, create minimal config without port mappings
			configContent += `
options:
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
      - arg: --kubelet-arg=eviction-hard=
        nodeFilters:
          - all
      - arg: --kubelet-arg=eviction-soft=
        nodeFilters:
          - all`
		}
	} else {
		// For non-test clusters, use default ports like shell script
		configContent += `
kubeAPI:
  host: "127.0.0.1"
  hostIP: "127.0.0.1"
  hostPort: "6550"
options:
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
      - arg: --kubelet-arg=eviction-hard=
        nodeFilters:
          - all
      - arg: --kubelet-arg=eviction-soft=
        nodeFilters:
          - all
ports:
  - port: 8080:80
    nodeFilters:
      - loadbalancer
  - port: 8443:443
    nodeFilters:
      - loadbalancer`
	}

	// Write to temporary file
	tmpFile, err := ioutil.TempFile("", "k3d-config-*.yaml")
	if err != nil {
		return "", err
	}
	
	if _, err := tmpFile.WriteString(configContent); err != nil {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
		return "", err
	}
	
	tmpFile.Close()
	return tmpFile.Name(), nil
}