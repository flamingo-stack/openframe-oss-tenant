package cluster

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

	"github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/common/executor"
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
	DetectClusterType(ctx context.Context, name string) (domain.ClusterType, error)
	ListClusters(ctx context.Context) ([]domain.ClusterInfo, error)
	ListAllClusters(ctx context.Context) ([]domain.ClusterInfo, error)
}

// K3dManager manages K3D cluster operations
type K3dManager struct {
	executor executor.CommandExecutor
	verbose  bool
}

// NewK3dManager creates a new K3D cluster manager
func NewK3dManager(exec executor.CommandExecutor, verbose bool) *K3dManager {
	return &K3dManager{
		executor: exec,
		verbose:  verbose,
	}
}

// CreateCluster creates a new K3D cluster using config file approach
func (m *K3dManager) CreateCluster(ctx context.Context, config domain.ClusterConfig) error {
	if err := m.validateClusterConfig(config); err != nil {
		return err
	}

	if config.Type != domain.ClusterTypeK3d {
		return domain.NewProviderNotFoundError(config.Type)
	}

	configFile, err := m.createK3dConfigFile(config)
	if err != nil {
		return domain.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create config file: %w", err))
	}
	defer os.Remove(configFile)

	if m.verbose {
		if configContent, err := os.ReadFile(configFile); err == nil {
			fmt.Printf("DEBUG: Config file content for %s:\n%s\n", config.Name, string(configContent))
		}
	}

	args := []string{"cluster", "create", "--config", configFile, "--timeout", defaultTimeout}
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

	if clusterType != domain.ClusterTypeK3d {
		return domain.NewProviderNotFoundError(clusterType)
	}

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

	if clusterType != domain.ClusterTypeK3d {
		return domain.NewProviderNotFoundError(clusterType)
	}

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
	args := []string{"cluster", "list", "--output", "json"}

	result, err := m.executor.Execute(ctx, "k3d", args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list clusters: %w", err)
	}

	var k3dClusters []k3dClusterInfo
	if err := json.Unmarshal([]byte(result.Stdout), &k3dClusters); err != nil {
		return nil, fmt.Errorf("failed to parse cluster list JSON: %w", err)
	}

	var clusters []domain.ClusterInfo
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
		
		clusters = append(clusters, domain.ClusterInfo{
			Name:      k3dCluster.Name,
			Type:      domain.ClusterTypeK3d,
			Status:    fmt.Sprintf("%d/%d", k3dCluster.ServersRunning, k3dCluster.ServersCount),
			NodeCount: k3dCluster.AgentsCount + k3dCluster.ServersCount,
			CreatedAt: createdAt,
			Nodes:     []domain.NodeInfo{},
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

// DetectClusterType determines if a cluster is K3D
func (m *K3dManager) DetectClusterType(ctx context.Context, name string) (domain.ClusterType, error) {
	if name == "" {
		return "", domain.NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	args := []string{"cluster", "get", name}
	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return "", domain.NewClusterNotFoundError(name)
	}

	return domain.ClusterTypeK3d, nil
}

// GetKubeconfig gets the kubeconfig for a specific K3D cluster
func (m *K3dManager) GetKubeconfig(ctx context.Context, name string, clusterType domain.ClusterType) (string, error) {
	if clusterType != domain.ClusterTypeK3d {
		return "", domain.NewProviderNotFoundError(clusterType)
	}

	args := []string{"kubeconfig", "get", name}
	result, err := m.executor.Execute(ctx, "k3d", args...)
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig for cluster %s: %w", name, err)
	}

	return result.Stdout, nil
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

// createK3dConfigFile creates a k3d config file
func (m *K3dManager) createK3dConfigFile(config domain.ClusterConfig) (string, error) {
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
	if ports, err := m.findAvailablePorts(3); err == nil && len(ports) >= 3 {
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
	} else {
		// Fallback to default ports if dynamic allocation fails
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
      - loadbalancer`, defaultAPIPort, defaultHTTPPort, defaultHTTPSPort)
	}

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

// findAvailablePorts finds the specified number of available TCP ports
func (m *K3dManager) findAvailablePorts(count int) ([]int, error) {
	var ports []int
	startPort := dynamicPortStart + (int(time.Now().UnixNano()) % 10000)

	for i := 0; i < count; i++ {
		for port := startPort + i*portSearchStep; port < dynamicPortEnd; port++ {
			if m.isPortAvailable(port) {
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
	Name    string    `json:"name"`
	Role    string    `json:"role"`
	Created time.Time `json:"created"`
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
