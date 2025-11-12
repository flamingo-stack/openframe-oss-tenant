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

	// Prepare kubeconfig directory before k3d operations (Windows/WSL and Linux CI)
	if err := m.prepareKubeconfigDirectory(ctx); err != nil {
		if m.verbose {
			fmt.Printf("Warning: Could not prepare kubeconfig directory: %v\n", err)
		}
		// Don't fail - k3d will create it, but log the warning
	}

	// Clean up any stale lock files that might prevent k3d from updating kubeconfig
	if err := m.cleanupStaleLockFiles(ctx); err != nil {
		if m.verbose {
			fmt.Printf("Warning: Could not cleanup stale lock files: %v\n", err)
		}
		// Don't fail - this is not critical
	}

	// Convert Windows path to WSL path if running on Windows
	configFilePath := configFile
	if runtime.GOOS == "windows" {
		configFilePath, err = m.convertWindowsPathToWSL(configFile)
		if err != nil {
			return models.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to convert config file path for WSL: %w", err))
		}
		if m.verbose {
			fmt.Printf("DEBUG: Converted Windows path '%s' to WSL path '%s'\n", configFile, configFilePath)
		}
	}

	args := []string{
		"cluster", "create",
		"--config", configFilePath,
		"--timeout", m.timeout,
		"--kubeconfig-update-default", // Update default kubeconfig with new cluster context
		"--kubeconfig-switch-context", // Automatically switch to new cluster context
	}
	if m.verbose {
		args = append(args, "--verbose")
	}

	if _, err := m.executor.Execute(ctx, "k3d", args...); err != nil {
		return models.NewClusterOperationError("create", config.Name, fmt.Errorf("failed to create cluster %s: %w", config.Name, err))
	}

	// Fix kubeconfig permissions if k3d ran with sudo (Windows/WSL and Linux CI)
	// This is necessary because k3d creates ~/.kube/config with root ownership when run with sudo
	if err := m.fixKubeconfigPermissions(ctx); err != nil {
		if m.verbose {
			fmt.Printf("Warning: Could not fix kubeconfig permissions: %v\n", err)
		}
		// Don't fail - this is not critical, just log the warning
	}

	// Set kubectl context to the newly created cluster
	contextName := fmt.Sprintf("k3d-%s", config.Name)
	if _, err := m.executor.Execute(ctx, "kubectl", "config", "use-context", contextName); err != nil {
		// Log warning but don't fail immediately - k3d's --kubeconfig-switch-context should handle this
		if m.verbose {
			fmt.Printf("Warning: Could not switch kubectl context: %v\n", err)
		}
	}

	// Verify the cluster is reachable
	if err := m.verifyClusterReachable(ctx, config.Name); err != nil {
		return models.NewClusterOperationError("create", config.Name, fmt.Errorf("cluster created but not reachable: %w", err))
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

// convertWindowsPathToWSL converts a Windows path to a WSL path format
// Example: C:\Users\foo\file.txt -> /mnt/c/Users/foo/file.txt
func (m *K3dManager) convertWindowsPathToWSL(windowsPath string) (string, error) {
	if windowsPath == "" {
		return "", fmt.Errorf("empty path provided")
	}

	// Replace backslashes with forward slashes
	path := strings.ReplaceAll(windowsPath, "\\", "/")

	// Convert drive letter (e.g., C: -> /mnt/c)
	if len(path) >= 2 && path[1] == ':' {
		driveLetter := strings.ToLower(string(path[0]))
		// Remove the drive letter and colon, then prepend /mnt/<drive>
		path = "/mnt/" + driveLetter + path[2:]
	}

	return path, nil
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

// getWSLUser determines the correct WSL user to use for kubeconfig operations
// It tries to detect the non-root user that k3d/kubectl will run as
func (m *K3dManager) getWSLUser(ctx context.Context) (string, error) {
	// First, try to get the user specified for the runner user (standard in GitHub Actions)
	result, err := m.executor.Execute(ctx, "wsl", "-d", "Ubuntu", "-u", "runner", "whoami")
	if err == nil && strings.TrimSpace(result.Stdout) == "runner" {
		return "runner", nil
	}

	// If runner doesn't exist, try to find the first non-root user with a home directory
	result, err = m.executor.Execute(ctx, "wsl", "-d", "Ubuntu", "bash", "-c", "getent passwd | grep '/home/' | head -1 | cut -d: -f1")
	if err == nil && strings.TrimSpace(result.Stdout) != "" {
		username := strings.TrimSpace(result.Stdout)
		// Verify this user exists and has a home directory
		if verifyResult, verifyErr := m.executor.Execute(ctx, "wsl", "-d", "Ubuntu", "-u", username, "whoami"); verifyErr == nil {
			if strings.TrimSpace(verifyResult.Stdout) == username {
				return username, nil
			}
		}
	}

	// If we can't detect a proper user, default to "runner" (common in CI environments)
	// This is safer than using root, which causes permission issues
	return "runner", nil
}

// prepareKubeconfigDirectory ensures ~/.kube directory exists with proper permissions on Windows/WSL and Linux
func (m *K3dManager) prepareKubeconfigDirectory(ctx context.Context) error {
	if runtime.GOOS == "windows" {
		// Get the WSL user that k3d will run as
		// The wrappers in the workflow use "runner", so we should detect or default to that
		username, err := m.getWSLUser(ctx)
		if err != nil {
			return fmt.Errorf("failed to get WSL user: %w", err)
		}

		// Create .kube directory with proper permissions in WSL
		createCmd := "mkdir -p ~/.kube && chmod 755 ~/.kube"
		_, err = m.executor.Execute(ctx, "wsl", "-d", "Ubuntu", "-u", username, "bash", "-c", createCmd)
		if err != nil {
			return fmt.Errorf("failed to create .kube directory: %w", err)
		}

		if m.verbose {
			fmt.Println("✓ Prepared kubeconfig directory in WSL")
		}
	} else {
		// Linux/macOS: Create .kube directory with proper permissions
		createCmd := "mkdir -p ~/.kube && chmod 755 ~/.kube"
		_, err := m.executor.Execute(ctx, "bash", "-c", createCmd)
		if err != nil {
			return fmt.Errorf("failed to create .kube directory: %w", err)
		}

		if m.verbose {
			fmt.Println("✓ Prepared kubeconfig directory")
		}
	}

	return nil
}

// fixKubeconfigPermissions fixes kubeconfig file permissions on Windows/WSL and Linux
// This is needed because k3d running with sudo creates ~/.kube/config with root ownership
func (m *K3dManager) fixKubeconfigPermissions(ctx context.Context) error {
	if runtime.GOOS == "windows" {
		// Get the WSL user that k3d will run as
		// The wrappers in the workflow use "runner", so we should detect or default to that
		username, err := m.getWSLUser(ctx)
		if err != nil {
			return fmt.Errorf("failed to get WSL user: %w", err)
		}

		// Fix ownership and permissions of kubeconfig file in WSL
		// Use bash -c to run multiple commands together
		fixCmd := fmt.Sprintf("test -f ~/.kube/config && sudo chown %s:%s ~/.kube/config && sudo chmod 600 ~/.kube/config", username, username)
		_, err = m.executor.Execute(ctx, "wsl", "-d", "Ubuntu", "-u", username, "bash", "-c", fixCmd)
		if err != nil {
			return fmt.Errorf("failed to fix kubeconfig permissions: %w", err)
		}

		if m.verbose {
			fmt.Println("✓ Fixed kubeconfig permissions for WSL user")
		}
	} else {
		// Linux/macOS: Fix permissions without changing ownership (assuming we're the owner)
		// First check if the file exists and needs fixing
		fixCmd := "test -f ~/.kube/config && chmod 600 ~/.kube/config || true"
		_, err := m.executor.Execute(ctx, "bash", "-c", fixCmd)
		if err != nil {
			return fmt.Errorf("failed to fix kubeconfig permissions: %w", err)
		}

		if m.verbose {
			fmt.Println("✓ Fixed kubeconfig permissions")
		}
	}

	return nil
}

// verifyClusterReachable checks if the cluster is reachable via kubectl
func (m *K3dManager) verifyClusterReachable(ctx context.Context, clusterName string) error {
	// Try to reach the cluster using kubectl
	contextName := fmt.Sprintf("k3d-%s", clusterName)

	// First verify the context exists
	if _, err := m.executor.Execute(ctx, "kubectl", "config", "get-contexts", contextName); err != nil {
		return fmt.Errorf("kubectl context not found: %w", err)
	}

	// Then verify we can reach the cluster API
	result, err := m.executor.Execute(ctx, "kubectl", "cluster-info")
	if err != nil {
		return fmt.Errorf("cluster not reachable: %w", err)
	}

	if m.verbose {
		fmt.Printf("✓ Cluster is reachable:\n%s\n", result.Stdout)
	}

	return nil
}

// cleanupStaleLockFiles removes any stale kubeconfig lock files
func (m *K3dManager) cleanupStaleLockFiles(ctx context.Context) error {
	if runtime.GOOS == "windows" {
		// Get the WSL user
		username, err := m.getWSLUser(ctx)
		if err != nil {
			return fmt.Errorf("failed to get WSL user: %w", err)
		}

		// Remove lock files in WSL
		cleanupCmd := "rm -f ~/.kube/config.lock ~/.kube/config.lock.* 2>/dev/null || true"
		_, err = m.executor.Execute(ctx, "wsl", "-d", "Ubuntu", "-u", username, "bash", "-c", cleanupCmd)
		if err != nil {
			return fmt.Errorf("failed to cleanup lock files: %w", err)
		}
	} else {
		// Linux/macOS: Remove lock files
		cleanupCmd := "rm -f ~/.kube/config.lock ~/.kube/config.lock.* 2>/dev/null || true"
		_, err := m.executor.Execute(ctx, "bash", "-c", cleanupCmd)
		if err != nil {
			return fmt.Errorf("failed to cleanup lock files: %w", err)
		}
	}

	if m.verbose {
		fmt.Println("✓ Cleaned up stale kubeconfig lock files")
	}

	return nil
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
