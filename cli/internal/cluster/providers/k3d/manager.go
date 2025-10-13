package k3d

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
)

// Constants for configuration
const (
	defaultK3sImage    = "rancher/k3s:v1.31.5-k3s1"
	defaultTimeout     = "300s"
	defaultAPIPort     = "6550"
	defaultHTTPPort    = "8080"
	defaultHTTPSPort   = "8443"
	dynamicPortStart   = 20000
	dynamicPortEnd     = 50000
	portSearchStep     = 1000
	timestampSuffixLen = 6
)

// ClusterManager interface for managing clusters
type ClusterManager interface {
	DetectClusterType(ctx context.Context, name string) (models.ClusterType, error)
	ListClusters(ctx context.Context) ([]models.ClusterInfo, error)
	ListAllClusters(ctx context.Context) ([]models.ClusterInfo, error)
}

// K3dManager manages K3D cluster operations
type K3dManager struct {
	executor executor.CommandExecutor
	verbose  bool
	timeout  string
}

// NewK3dManager creates a new K3D cluster manager with default timeout
func NewK3dManager(exec executor.CommandExecutor, verbose bool) *K3dManager {
	return &K3dManager{
		executor: exec,
		verbose:  verbose,
		timeout:  defaultTimeout,
	}
}

// NewK3dManagerWithTimeout creates a new K3D cluster manager with custom timeout
func NewK3dManagerWithTimeout(exec executor.CommandExecutor, verbose bool, timeout string) *K3dManager {
	return &K3dManager{
		executor: exec,
		verbose:  verbose,
		timeout:  timeout,
	}
}

// CreateCluster creates a new K3D cluster using config file approach
func (m *K3dManager) CreateCluster(ctx context.Context, config models.ClusterConfig) error {
	if err := m.validateClusterConfig(config); err != nil {
		return err
	}

	if config.Type != models.ClusterTypeK3d {
		return models.NewProviderNotFoundError(config.Type)
	}

	configFile, err := m.createK3dConfigFile(config)
	if err != nil {
		return models.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create config file: %w", err))
	}
	defer os.Remove(configFile)

	if m.verbose {
		if configContent, err := os.ReadFile(configFile); err == nil {
			fmt.Printf("DEBUG: Config file content for %s:\n%s\n", config.Name, string(configContent))
		}
	}

	args := []string{"cluster", "create", "--config", configFile, "--timeout", m.timeout}
	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return models.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create cluster %s: %w", config.Name, err))
	}

	// Set kubectl context to the newly created cluster
	contextName := fmt.Sprintf("k3d-%s", config.Name)
	if _, err := m.executor.Execute(ctx, "kubectl", "config", "use-context", contextName); err != nil {
		return models.NewClusterOperationError("context-switch", config.Name, fmt.Errorf("failed to switch kubectl context to %s: %w", contextName, err))
	}

	return nil
}

// DeleteCluster removes a K3D cluster
func (m *K3dManager) DeleteCluster(ctx context.Context, name string, clusterType models.ClusterType, force bool) error {
	if name == "" {
		return models.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	if clusterType != models.ClusterTypeK3d {
		return models.NewProviderNotFoundError(clusterType)
	}

	args := []string{"cluster", "delete", name}
	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return models.NewClusterOperationError("delete", name, fmt.Errorf("failed to delete cluster %s: %w", name, err))
	}

	return nil
}

// StartCluster starts a K3D cluster
func (m *K3dManager) StartCluster(ctx context.Context, name string, clusterType models.ClusterType) error {
	if name == "" {
		return models.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	if clusterType != models.ClusterTypeK3d {
		return models.NewProviderNotFoundError(clusterType)
	}

	args := []string{"cluster", "start", name}
	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return models.NewClusterOperationError("start", name, fmt.Errorf("failed to start cluster %s: %w", name, err))
	}

	return nil
}

// ListClusters returns all K3D clusters
func (m *K3dManager) ListClusters(ctx context.Context) ([]models.ClusterInfo, error) {
	args := []string{"cluster", "list", "--output", "json"}

	result, err := m.executor.Execute(ctx, "k3d", args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list clusters: %w", err)
	}

	var k3dClusters []k3dClusterInfo
	if err := json.Unmarshal([]byte(result.Stdout), &k3dClusters); err != nil {
		return nil, fmt.Errorf("failed to parse cluster list JSON: %w", err)
	}

	var clusters []models.ClusterInfo
	for _, k3dCluster := range k3dClusters {
		// Find the earliest server node creation time as cluster creation time
		var createdAt time.Time
		for _, node := range k3dCluster.Nodes {
			if node.Role == "server" {
				if createdAt.IsZero() || node.Created.Before(createdAt) {
					createdAt = node.Created
				}
			}
		}

		clusters = append(clusters, models.ClusterInfo{
			Name:      k3dCluster.Name,
			Type:      models.ClusterTypeK3d,
			Status:    fmt.Sprintf("%d/%d", k3dCluster.ServersRunning, k3dCluster.ServersCount),
			NodeCount: k3dCluster.AgentsCount + k3dCluster.ServersCount,
			CreatedAt: createdAt,
			Nodes:     []models.NodeInfo{},
		})
	}

	return clusters, nil
}

// ListAllClusters is an alias for ListClusters for backward compatibility
func (m *K3dManager) ListAllClusters(ctx context.Context) ([]models.ClusterInfo, error) {
	return m.ListClusters(ctx)
}

// GetClusterStatus returns detailed status for a specific K3D cluster
func (m *K3dManager) GetClusterStatus(ctx context.Context, name string) (models.ClusterInfo, error) {
	if name == "" {
		return models.ClusterInfo{}, models.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	clusters, err := m.ListClusters(ctx)
	if err != nil {
		return models.ClusterInfo{}, models.NewClusterOperationError("status", name, err)
	}

	for _, clusterInfo := range clusters {
		if clusterInfo.Name == name {
			return clusterInfo, nil
		}
	}

	return models.ClusterInfo{}, models.NewClusterOperationError("status", name, fmt.Errorf("cluster %s not found", name))
}

// DetectClusterType determines if a cluster is K3D
func (m *K3dManager) DetectClusterType(ctx context.Context, name string) (models.ClusterType, error) {
	if name == "" {
		return "", models.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	args := []string{"cluster", "get", name}
	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return "", models.NewClusterNotFoundError(name)
	}

	return models.ClusterTypeK3d, nil
}

// GetKubeconfig gets the kubeconfig for a specific K3D cluster
func (m *K3dManager) GetKubeconfig(ctx context.Context, name string, clusterType models.ClusterType) (string, error) {
	if clusterType != models.ClusterTypeK3d {
		return "", models.NewProviderNotFoundError(clusterType)
	}

	args := []string{"kubeconfig", "get", name}
	result, err := m.executor.Execute(ctx, "k3d", args...)
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig for cluster %s: %w", name, err)
	}

	return result.Stdout, nil
}

// validateClusterConfig validates the cluster configuration
func (m *K3dManager) validateClusterConfig(config models.ClusterConfig) error {
	if config.Name == "" {
		return models.NewInvalidConfigError("name", config.Name, "cluster name cannot be empty")
	}
	if config.Type == "" {
		return models.NewInvalidConfigError("type", config.Type, "cluster type cannot be empty")
	}
	if config.NodeCount < 1 {
		return models.NewInvalidConfigError("nodeCount", config.NodeCount, "node count must be at least 1")
	}
	return nil
}

// createK3dConfigFile creates a k3d config file
func (m *K3dManager) createK3dConfigFile(config models.ClusterConfig) (string, error) {
	image := defaultK3sImage
	if runtime.GOARCH == "arm64" {
		image = defaultK3sImage
	}
	if config.K8sVersion != "" {
		image = "rancher/k3s:" + config.K8sVersion
	}

	servers := 1
	agents := config.NodeCount
	if agents < 1 {
		agents = 1
	}

	configContent := fmt.Sprintf(`apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: %s
servers: %d
agents: %d
image: %s`, config.Name, servers, agents, image)

	// Always use dynamic ports to avoid conflicts, regardless of cluster name
	ports, err := m.findAvailablePorts(3)
	if err != nil || len(ports) < 3 {
		return "", fmt.Errorf("failed to allocate available ports: %w", err)
	}

	apiPort := strconv.Itoa(ports[0])
	httpPort := strconv.Itoa(ports[1])
	httpsPort := strconv.Itoa(ports[2])

	configContent += fmt.Sprintf(`
kubeAPI:
  host: "127.0.0.1"
  hostIP: "127.0.0.1"
  hostPort: "%s"
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
      - loadbalancer`, apiPort, httpPort, httpsPort)

	tmpFile, err := os.CreateTemp("", "k3d-config-*.yaml")
	if err != nil {
		return "", err
	}
	defer tmpFile.Close()

	if _, err := tmpFile.WriteString(configContent); err != nil {
		os.Remove(tmpFile.Name())
		return "", err
	}

	return tmpFile.Name(), nil
}

// isTestCluster determines if a cluster name indicates it's a test cluster
func (m *K3dManager) isTestCluster(name string) bool {
	testPatterns := []string{
		"test", "cleanup", "status", "list", "delete", "create",
		"multi", "single", "default_config", "with_type", "manual",
	}

	for _, pattern := range testPatterns {
		if strings.Contains(name, pattern) {
			return true
		}
	}

	return len(name) > timestampSuffixLen &&
		name[len(name)-timestampSuffixLen:] != name &&
		strings.ContainsAny(name[len(name)-timestampSuffixLen:], "0123456789")
}

// findAvailablePorts finds the specified number of available TCP ports using intelligent approach
func (m *K3dManager) findAvailablePorts(count int) ([]int, error) {
	// Get ports used by existing k3d clusters
	usedPorts := m.getUsedPortsByExistingClusters()

	// Start with default ports and increment if busy (matching script behavior)
	defaultPorts := []int{6550, 80, 443} // API, HTTP, HTTPS
	alternatePorts := []int{6551, 8080, 8443}

	var ports []int

	for i := 0; i < count && i < len(defaultPorts); i++ {
		// Check if default port is available and not used by existing clusters
		if m.isPortAvailable(defaultPorts[i]) && !m.isPortInUse(defaultPorts[i], usedPorts) {
			ports = append(ports, defaultPorts[i])
		} else if m.isPortAvailable(alternatePorts[i]) && !m.isPortInUse(alternatePorts[i], usedPorts) {
			ports = append(ports, alternatePorts[i])
		} else {
			// Find next available port that's not used by k3d clusters
			found := false
			for port := alternatePorts[i] + 1; port < alternatePorts[i]+1000; port++ {
				if m.isPortAvailable(port) && !m.isPortInUse(port, usedPorts) {
					ports = append(ports, port)
					found = true
					break
				}
			}
			if !found {
				return nil, fmt.Errorf("could not find available port for index %d", i)
			}
		}
	}

	if len(ports) < count {
		return nil, fmt.Errorf("could not find %d available ports", count)
	}

	return ports, nil
}

// getUsedPortsByExistingClusters returns a map of ports used by existing k3d clusters
func (m *K3dManager) getUsedPortsByExistingClusters() map[int]bool {
	usedPorts := make(map[int]bool)

	ctx := context.Background()
	result, err := m.executor.Execute(ctx, "k3d", "cluster", "list", "--output", "json")
	if err != nil {
		return usedPorts // Return empty map on error, will rely on port availability check
	}

	var k3dClusters []k3dClusterInfo
	if err := json.Unmarshal([]byte(result.Stdout), &k3dClusters); err != nil {
		return usedPorts // Return empty map on error
	}

	// Extract ports from all existing clusters
	for _, cluster := range k3dClusters {
		for _, node := range cluster.Nodes {
			if node.Role == "server" || node.Role == "loadbalancer" {
				// Parse runtime labels to get port bindings
				if apiPort, exists := node.RuntimeLabels["k3d.server.api.port"]; exists {
					if port, err := strconv.Atoi(apiPort); err == nil {
						usedPorts[port] = true
					}
				}

				// Parse port mappings from the load balancer
				for _, mappings := range node.PortMappings {
					for _, mapping := range mappings {
						if mapping.HostPort != "" {
							if port, err := strconv.Atoi(mapping.HostPort); err == nil {
								usedPorts[port] = true
							}
						}
					}
				}
			}
		}
	}

	return usedPorts
}

// isPortInUse checks if a port is in the used ports map
func (m *K3dManager) isPortInUse(port int, usedPorts map[int]bool) bool {
	return usedPorts[port]
}

// isPortAvailable checks if a TCP port is available
func (m *K3dManager) isPortAvailable(port int) bool {
	address := fmt.Sprintf(":%d", port)
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return false
	}
	defer listener.Close()
	return true
}

// k3dClusterInfo represents the JSON structure returned by k3d cluster list
type k3dClusterInfo struct {
	Name           string    `json:"name"`
	ServersCount   int       `json:"serversCount"`
	ServersRunning int       `json:"serversRunning"`
	AgentsCount    int       `json:"agentsCount"`
	AgentsRunning  int       `json:"agentsRunning"`
	Image          string    `json:"image,omitempty"`
	Nodes          []k3dNode `json:"nodes"`
}

// k3dNode represents a node in the k3d cluster
type k3dNode struct {
	Name          string                   `json:"name"`
	Role          string                   `json:"role"`
	Created       time.Time                `json:"created"`
	RuntimeLabels map[string]string        `json:"runtimeLabels,omitempty"`
	PortMappings  map[string][]PortMapping `json:"portMappings,omitempty"`
}

// PortMapping represents a port mapping for k3d nodes
type PortMapping struct {
	HostIP   string `json:"HostIp"`
	HostPort string `json:"HostPort"`
}

// Factory functions for backward compatibility

// CreateClusterManagerWithExecutor creates a K3D cluster manager with a specific command executor
func CreateClusterManagerWithExecutor(exec executor.CommandExecutor) *K3dManager {
	if exec == nil {
		panic("Executor cannot be nil - must be provided by calling code to avoid import cycles")
	}
	return NewK3dManager(exec, false)
}

// CreateDefaultClusterManager creates a K3D cluster manager with all default configuration
// Deprecated: Use CreateClusterManagerWithExecutor instead with a proper executor.
func CreateDefaultClusterManager() *K3dManager {
	panic("CreateDefaultClusterManager is deprecated - use CreateClusterManagerWithExecutor with proper executor")
}
