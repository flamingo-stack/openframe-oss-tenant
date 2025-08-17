package cluster

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/flamingo/openframe-cli/internal/common/utils"
)

// Removed domainProviderAdapter - no longer needed since K3dDirectProvider works with cluster types directly

// ClusterManager is the interface for managing clusters (for backward compatibility)
type ClusterManager interface {
	DetectClusterType(ctx context.Context, name string) (ClusterType, error)
	ListClusters(ctx context.Context) ([]ClusterInfo, error)
	ListAllClusters(ctx context.Context) ([]ClusterInfo, error)
}

// K3dManager manages K3D cluster operations directly
// Simplified architecture with inline K3D operations - no provider abstraction needed
type K3dManager struct {
	executor utils.CommandExecutor
	verbose  bool
}

// NewK3dManager creates a new K3D cluster manager with direct K3D operations
func NewK3dManager(executor utils.CommandExecutor, verbose bool) *K3dManager {
	return &K3dManager{
		executor: executor,
		verbose:  verbose,
	}
}

// Removed provider registry methods - using direct K3D provider instead

// Manager now implements ClusterService directly - no need for GetService

// CreateCluster creates a new K3D cluster
func (m *K3dManager) CreateCluster(ctx context.Context, config ClusterConfig) error {
	// Validate configuration
	if err := m.validateClusterConfig(config); err != nil {
		return err
	}

	// Only support K3D for now
	if config.Type != ClusterTypeK3d {
		return NewProviderNotFoundError(config.Type)
	}

	// Inline K3D cluster creation
	args := []string{
		"cluster", "create", config.Name,
		"--agents", strconv.Itoa(config.NodeCount),
		"--api-port", "6550",
		"--port", "8080:80@loadbalancer",
		"--port", "8443:443@loadbalancer",
	}

	if config.K8sVersion != "" {
		args = append(args, "--image", "rancher/k3s:"+config.K8sVersion)
	}

	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create cluster %s: %w", config.Name, err))
	}

	return nil
}

// DeleteCluster removes a K3D cluster
func (m *K3dManager) DeleteCluster(ctx context.Context, name string, clusterType ClusterType, force bool) error {
	if name == "" {
		return NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Only support K3D for now
	if clusterType != ClusterTypeK3d {
		return NewProviderNotFoundError(clusterType)
	}

	// Inline K3D cluster deletion
	args := []string{"cluster", "delete", name}

	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return NewClusterOperationError("delete", name, fmt.Errorf("failed to delete cluster %s: %w", name, err))
	}

	return nil
}

// StartCluster starts a K3D cluster
func (m *K3dManager) StartCluster(ctx context.Context, name string, clusterType ClusterType) error {
	if name == "" {
		return NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Only support K3D for now
	if clusterType != ClusterTypeK3d {
		return NewProviderNotFoundError(clusterType)
	}

	// Inline K3D cluster start
	args := []string{"cluster", "start", name}

	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return NewClusterOperationError("start", name, fmt.Errorf("failed to start cluster %s: %w", name, err))
	}

	return nil
}

// ListClusters returns all K3D clusters
func (m *K3dManager) ListClusters(ctx context.Context) ([]ClusterInfo, error) {
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

	var clusters []ClusterInfo
	for _, k3dCluster := range k3dClusters {
		clusters = append(clusters, ClusterInfo{
			Name:      k3dCluster.Name,
			Type:      ClusterTypeK3d,
			Status:    strings.ToLower(k3dCluster.ServersRunning) + "/" + strings.ToLower(k3dCluster.ServersCount),
			NodeCount: parseNodeCount(k3dCluster.AgentsCount, k3dCluster.ServersCount),
			Nodes:     []NodeInfo{}, // TODO: populate with actual node info
		})
	}

	return clusters, nil
}

// ListAllClusters is an alias for ListClusters for backward compatibility
func (m *K3dManager) ListAllClusters(ctx context.Context) ([]ClusterInfo, error) {
	return m.ListClusters(ctx)
}

// GetClusterStatus returns detailed status for a specific K3D cluster
func (m *K3dManager) GetClusterStatus(ctx context.Context, name string) (ClusterInfo, error) {
	if name == "" {
		return ClusterInfo{}, NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Inline K3D cluster status - get from list and find specific cluster
	clusters, err := m.ListClusters(ctx)
	if err != nil {
		return ClusterInfo{}, NewClusterOperationError("status", name, err)
	}

	for _, clusterInfo := range clusters {
		if clusterInfo.Name == name {
			return clusterInfo, nil
		}
	}

	return ClusterInfo{}, NewClusterOperationError("status", name, fmt.Errorf("cluster %s not found", name))
}

// DetectClusterType determines if a cluster is K3D (the only supported type)
func (m *K3dManager) DetectClusterType(ctx context.Context, name string) (ClusterType, error) {
	if name == "" {
		return "", NewInvalidConfigError("name", name, "cluster name cannot be empty")
	}

	// Inline K3D cluster detection
	args := []string{"cluster", "get", name}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return "", NewClusterNotFoundError(name)
	}

	return ClusterTypeK3d, nil
}

// GetKubeconfig gets the kubeconfig for a specific K3D cluster
func (m *K3dManager) GetKubeconfig(ctx context.Context, name string, clusterType ClusterType) (string, error) {
	// Only support K3D for now
	if clusterType != ClusterTypeK3d {
		return "", NewProviderNotFoundError(clusterType)
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
func CreateClusterManagerWithExecutor(executor utils.CommandExecutor) *K3dManager {
	// Executor must be provided to avoid import cycles
	if executor == nil {
		panic("Executor cannot be nil - must be provided by calling code to avoid import cycles")
	}
	
	// Create K3D manager directly (no provider abstraction needed)
	return NewK3dManager(executor, false) // Default to non-verbose
}

// validateClusterConfig validates the cluster configuration
func (m *K3dManager) validateClusterConfig(config ClusterConfig) error {
	if config.Name == "" {
		return NewInvalidConfigError("name", config.Name, "cluster name cannot be empty")
	}

	if config.Type == "" {
		return NewInvalidConfigError("type", config.Type, "cluster type cannot be empty")
	}

	if config.NodeCount < 1 {
		return NewInvalidConfigError("nodeCount", config.NodeCount, "node count must be at least 1")
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
	ServersCount   string `json:"serversCount"`
	ServersRunning string `json:"serversRunning"`
	AgentsCount    string `json:"agentsCount"`
	AgentsRunning  string `json:"agentsRunning"`
	Image          string `json:"image"`
}

// parseNodeCount combines servers and agents into total node count
func parseNodeCount(agents, servers string) int {
	agentCount, _ := strconv.Atoi(agents)
	serverCount, _ := strconv.Atoi(servers)
	return agentCount + serverCount
}