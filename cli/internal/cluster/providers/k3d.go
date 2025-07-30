package providers

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/config"
)

// K3dProvider implements ClusterProvider for K3d clusters
type K3dProvider struct {
	options cluster.ProviderOptions
	config  *config.OpenFrameConfig
}

// NewK3dProvider creates a new K3d cluster provider
func NewK3dProvider(opts cluster.ProviderOptions) *K3dProvider {
	return &K3dProvider{
		options: opts,
		config:  config.DefaultConfig(),
	}
}

// Create creates a new K3d cluster based on the existing shell script logic
func (k *K3dProvider) Create(ctx context.Context, config *cluster.ClusterConfig) error {
	// In dry-run mode, skip actual operations
	if k.options.DryRun {
		if k.options.Output != nil {
			fmt.Fprintf(k.options.Output, "DRY RUN: Would create k3d cluster '%s' with %d nodes\n", config.Name, config.NodeCount)
		} else {
			fmt.Printf("DRY RUN: Would create k3d cluster '%s' with %d nodes\n", config.Name, config.NodeCount)
		}
		return nil
	}

	// Check if cluster already exists and delete it if it does
	if exists, err := k.clusterExists(config.Name); err != nil {
		return fmt.Errorf("failed to check if cluster exists: %w", err)
	} else if exists {
		if k.options.Output != nil {
			fmt.Fprintf(k.options.Output, "Existing cluster '%s' found. Deleting before recreation...\n", config.Name)
		} else {
			fmt.Printf("Existing cluster '%s' found. Deleting before recreation...\n", config.Name)
		}

		// Delete the existing cluster
		if err := k.Delete(context.Background(), config.Name); err != nil {
			return fmt.Errorf("failed to delete existing cluster: %w", err)
		}

		if k.options.Output != nil {
			fmt.Fprintf(k.options.Output, "Existing cluster '%s' deleted successfully.\n", config.Name)
		} else {
			fmt.Printf("Existing cluster '%s' deleted successfully.\n", config.Name)
		}
	}

	// Get system information for optimal node configuration
	systemInfo, err := k.getSystemInfo()
	if err != nil {
		return fmt.Errorf("failed to get system information: %w", err)
	}

	// Set defaults based on system capabilities
	if config.NodeCount == 0 {
		config.NodeCount = systemInfo.OptimalAgents
	}

	// Check port availability and set defaults
	ports, err := k.getAvailablePorts()
	if err != nil {
		return fmt.Errorf("failed to check port availability: %w", err)
	}

	// Create config file
	configFile, err := k.createK3dConfig(config, systemInfo, ports)
	if err != nil {
		return fmt.Errorf("failed to create k3d config: %w", err)
	}

	defer os.Remove(configFile)

	// Clean up any existing resources
	if err := k.cleanup(config.Name); err != nil {
		return fmt.Errorf("failed to cleanup existing resources: %w", err)
	}

	// Create the cluster
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "create",
		"--config", configFile,
		"--timeout", "180s")

	if k.options.Verbose {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create k3d cluster: %w", err)
	}

	// Set up kubeconfig
	if err := k.setupKubeconfig(config.Name); err != nil {
		return fmt.Errorf("failed to setup kubeconfig: %w", err)
	}

	// Wait for cluster to be ready
	if err := k.waitForClusterReady(ctx, config.Name); err != nil {
		return fmt.Errorf("cluster failed to become ready: %w", err)
	}

	return nil
}

// Delete removes a K3d cluster
func (k *K3dProvider) Delete(ctx context.Context, name string) error {
	// Quit telepresence first
	exec.Command("telepresence", "quit").Run()

	// Delete the cluster
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "delete", name, "--all")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to delete k3d cluster: %w", err)
	}

	// Clean up Docker networks
	exec.Command("docker", "network", "prune", "-f").Run()

	return nil
}

// List returns all K3d clusters
func (k *K3dProvider) List(ctx context.Context) ([]*cluster.ClusterInfo, error) {
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "list", "--no-headers")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list k3d clusters: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var clusters []*cluster.ClusterInfo

	for _, line := range lines {
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) >= 3 {
			// Extract cluster name, servers, and agents info
			name := fields[0]

			// Get detailed node information for this cluster
			nodes, _ := k.getNodeInfo(ctx, name)

			// Determine status based on whether we can get node info
			status := "Running"
			if len(nodes) == 0 {
				status = "Not Ready"
			}

			info := &cluster.ClusterInfo{
				Name:   name,
				Type:   cluster.ClusterTypeK3d,
				Status: status,
				Nodes:  nodes,
			}
			clusters = append(clusters, info)
		}
	}

	return clusters, nil
}

// GetKubeconfig returns the kubeconfig for a K3d cluster
func (k *K3dProvider) GetKubeconfig(ctx context.Context, name string) (string, error) {
	cmd := exec.CommandContext(ctx, "k3d", "kubeconfig", "get", name)
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig: %w", err)
	}
	return string(output), nil
}

// Status returns the status of a K3d cluster
func (k *K3dProvider) Status(ctx context.Context, name string) (*cluster.ClusterInfo, error) {
	exists, err := k.clusterExists(name)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("cluster %s not found", name)
	}

	// Get nodes information
	nodes, err := k.getNodeInfo(ctx, name)
	if err != nil {
		nodes = []cluster.NodeInfo{} // Continue even if we can't get node info
	}

	return &cluster.ClusterInfo{
		Name:   name,
		Type:   cluster.ClusterTypeK3d,
		Status: "Running",
		Nodes:  nodes,
	}, nil
}

// IsAvailable checks if K3d is installed and available
func (k *K3dProvider) IsAvailable() error {
	// Check if k3d is installed
	_, err := exec.LookPath("k3d")
	if err != nil {
		return fmt.Errorf("k3d is not installed or not in PATH")
	}

	// Check if Docker is running
	cmd := exec.Command("docker", "ps")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("Docker is not running.\n\nTo fix this:\n  - On macOS: Start Docker Desktop from Applications\n  - On Linux: Run 'sudo systemctl start docker'\n  - Or run: 'docker --version' to verify Docker installation")
	}

	return nil
}

// GetSupportedVersions returns supported K3s versions for K3d
func (k *K3dProvider) GetSupportedVersions() []string {
	return []string{
		"v1.33.0-k3s1",
		"v1.32.0-k3s1",
		"v1.31.0-k3s1",
	}
}

// SystemInfo holds system information for cluster configuration
type SystemInfo struct {
	CPU           int
	Memory        int
	IsARM64       bool
	OptimalAgents int
}

// PortInfo holds port configuration
type PortInfo struct {
	HTTP    int
	HTTPS   int
	APIPort int
}

// getSystemInfo detects system capabilities
func (k *K3dProvider) getSystemInfo() (*SystemInfo, error) {
	info := &SystemInfo{}

	// Detect CPU cores
	switch runtime.GOOS {
	case "darwin":
		if output, err := exec.Command("sysctl", "-n", "hw.ncpu").Output(); err == nil {
			if cpu, err := strconv.Atoi(strings.TrimSpace(string(output))); err == nil {
				info.CPU = cpu
			}
		}
		if output, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
			if mem, err := strconv.ParseInt(strings.TrimSpace(string(output)), 10, 64); err == nil {
				info.Memory = int(mem / 1024 / 1024 / 1024) // Convert to GB
			}
		}
		info.IsARM64 = runtime.GOARCH == "arm64"

	case "linux":
		if output, err := exec.Command("nproc").Output(); err == nil {
			if cpu, err := strconv.Atoi(strings.TrimSpace(string(output))); err == nil {
				info.CPU = cpu
			}
		}
		if output, err := exec.Command("free", "-g").Output(); err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				if strings.HasPrefix(line, "Mem:") {
					fields := strings.Fields(line)
					if len(fields) >= 2 {
						if mem, err := strconv.Atoi(fields[1]); err == nil {
							info.Memory = mem
						}
					}
					break
				}
			}
		}
		info.IsARM64 = runtime.GOARCH == "arm64"
	}

	// Set defaults if detection failed
	if info.CPU == 0 {
		info.CPU = 4
	}
	if info.Memory == 0 {
		info.Memory = 8
	}

	// Calculate optimal agents: 1 agent per 5 cores, minimum 1
	info.OptimalAgents = info.CPU / 5
	if info.OptimalAgents < 1 {
		info.OptimalAgents = 1
	}

	return info, nil
}

// getAvailablePorts checks port availability and returns usable ports
func (k *K3dProvider) getAvailablePorts() (*PortInfo, error) {
	ports := &PortInfo{
		HTTP:    80,
		HTTPS:   443,
		APIPort: 6550,
	}

	// Check HTTP port
	if !k.isPortAvailable(ports.HTTP) {
		// Try alternative HTTP ports
		alternativeHTTP := []int{8080, 9080, 10080}
		for _, port := range alternativeHTTP {
			if k.isPortAvailable(port) {
				ports.HTTP = port
				break
			}
		}
	}

	// Check HTTPS port
	if !k.isPortAvailable(ports.HTTPS) {
		// Try alternative HTTPS ports
		alternativeHTTPS := []int{8443, 9443, 10443}
		for _, port := range alternativeHTTPS {
			if k.isPortAvailable(port) {
				ports.HTTPS = port
				break
			}
		}
	}

	// Check API port
	if !k.isPortAvailable(ports.APIPort) {
		// Try alternative API ports
		alternativeAPI := []int{6551, 6552, 6553}
		for _, port := range alternativeAPI {
			if k.isPortAvailable(port) {
				ports.APIPort = port
				break
			}
		}
	}

	return ports, nil
}

// isPortAvailable checks if a port is available
func (k *K3dProvider) isPortAvailable(port int) bool {
	// Use lsof to check if port is in use
	cmd := exec.Command("lsof", "-i", fmt.Sprintf(":%d", port))
	err := cmd.Run()
	// If lsof returns 0, port is in use; if non-zero, port is available
	return err != nil
}

// createK3dConfig creates a temporary k3d configuration file
func (k *K3dProvider) createK3dConfig(config *cluster.ClusterConfig, systemInfo *SystemInfo, ports *PortInfo) (string, error) {
	// Select appropriate image based on architecture
	image := "rancher/k3s:v1.33.0-k3s1"
	if systemInfo.IsARM64 {
		image = "rancher/k3s:v1.33.0-k3s1"
	}

	if config.KubernetesVersion != "" {
		image = fmt.Sprintf("rancher/k3s:%s", config.KubernetesVersion)
		if systemInfo.IsARM64 {
			image += "-arm64"
		}
	}

	configContent := fmt.Sprintf(`apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: %s
servers: 1
agents: %d
image: %s
kubeAPI:
  host: "127.0.0.1"
  hostIP: "127.0.0.1"
  hostPort: "%d"
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
  - port: %d:80
    nodeFilters:
      - loadbalancer
  - port: %d:443
    nodeFilters:
      - loadbalancer
`, config.Name, config.NodeCount-1, image, ports.APIPort, ports.HTTP, ports.HTTPS)

	// Create temporary file
	tmpfile, err := os.CreateTemp("", "k3d-config-*.yaml")
	if err != nil {
		return "", err
	}

	if _, err := tmpfile.Write([]byte(configContent)); err != nil {
		tmpfile.Close()
		os.Remove(tmpfile.Name())
		return "", err
	}

	tmpfile.Close()
	return tmpfile.Name(), nil
}

// cleanup removes any existing resources
func (k *K3dProvider) cleanup(name string) error {
	// Check if cluster exists and delete it
	if exists, _ := k.clusterExists(name); exists {
		exec.Command("k3d", "cluster", "delete", name).Run()
		time.Sleep(5 * time.Second) // Wait for cleanup
	}

	// Force cleanup of stuck containers
	cmd := exec.Command("docker", "ps", "-a")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, fmt.Sprintf("k3d-%s", name)) {
				fields := strings.Fields(line)
				if len(fields) > 0 {
					exec.Command("docker", "rm", "-f", fields[0]).Run()
				}
			}
		}
	}

	return nil
}

// clusterExists checks if a k3d cluster exists
func (k *K3dProvider) clusterExists(name string) (bool, error) {
	cmd := exec.Command("k3d", "cluster", "list")
	output, err := cmd.Output()
	if err != nil {
		// Check if it's a Docker connectivity issue
		if strings.Contains(err.Error(), "docker") || strings.Contains(err.Error(), "Docker") {
			return false, fmt.Errorf("Docker is not running.\n\nTo fix this:\n  - On macOS: Start Docker Desktop from Applications\n  - On Linux: Run 'sudo systemctl start docker'\n  - Or run: 'docker --version' to verify Docker installation")
		}
		return false, fmt.Errorf("failed to list k3d clusters: %w", err)
	}
	return strings.Contains(string(output), name), nil
}

// setupKubeconfig configures kubectl to use the new cluster
func (k *K3dProvider) setupKubeconfig(name string) error {
	// Get k3d kubeconfig
	cmd := exec.Command("k3d", "kubeconfig", "get", name)
	kubeconfig, err := cmd.Output()
	if err != nil {
		return err
	}

	// Write to temporary file
	tmpfile, err := os.CreateTemp("", "k3d-kubeconfig-*.yaml")
	if err != nil {
		return err
	}
	defer os.Remove(tmpfile.Name())

	if _, err := tmpfile.Write(kubeconfig); err != nil {
		return err
	}
	tmpfile.Close()

	// Set up kubeconfig directory
	kubeconfigDir := os.ExpandEnv("$HOME/.kube")
	if err := os.MkdirAll(kubeconfigDir, 0755); err != nil {
		return err
	}

	kubeconfigFile := kubeconfigDir + "/config"

	// Merge with existing kubeconfig if it exists
	if _, err := os.Stat(kubeconfigFile); err == nil {
		// Merge configs
		cmd := exec.Command("kubectl", "config", "view", "--flatten")
		cmd.Env = append(os.Environ(), fmt.Sprintf("KUBECONFIG=%s:%s", kubeconfigFile, tmpfile.Name()))
		merged, err := cmd.Output()
		if err != nil {
			return err
		}

		if err := os.WriteFile(kubeconfigFile+".new", merged, 0600); err != nil {
			return err
		}

		if err := os.Rename(kubeconfigFile+".new", kubeconfigFile); err != nil {
			return err
		}
	} else {
		// Copy new kubeconfig
		if err := os.Rename(tmpfile.Name(), kubeconfigFile); err != nil {
			return err
		}
		if err := os.Chmod(kubeconfigFile, 0600); err != nil {
			return err
		}
	}

	// Switch context
	cmd = exec.Command("kubectl", "config", "use-context", fmt.Sprintf("k3d-%s", name))
	return cmd.Run()
}

// waitForClusterReady waits for the cluster to become ready
func (k *K3dProvider) waitForClusterReady(ctx context.Context, name string) error {
	timeout := time.NewTimer(5 * time.Minute)
	defer timeout.Stop()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	contextName := fmt.Sprintf("k3d-%s", name)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timeout.C:
			return fmt.Errorf("timeout waiting for cluster to become ready")
		case <-ticker.C:
			// Check if nodes are ready
			cmd := exec.Command("kubectl", "--context", contextName, "get", "nodes")
			output, err := cmd.Output()
			if err != nil {
				continue
			}

			if strings.Contains(string(output), "Ready") {
				// Test namespace creation
				cmd = exec.Command("kubectl", "--context", contextName, "create", "namespace", "test-namespace")
				if err := cmd.Run(); err != nil {
					continue
				}

				// Clean up test namespace
				exec.Command("kubectl", "--context", contextName, "delete", "namespace", "test-namespace").Run()
				return nil
			}
		}
	}
}

// getNodeInfo retrieves node information
func (k *K3dProvider) getNodeInfo(ctx context.Context, name string) ([]cluster.NodeInfo, error) {
	contextName := fmt.Sprintf("k3d-%s", name)
	cmd := exec.CommandContext(ctx, "kubectl", "--context", contextName, "get", "nodes",
		"--no-headers", "-o", "custom-columns=NAME:.metadata.name,ROLES:.metadata.labels['node-role\\.kubernetes\\.io/control-plane'],STATUS:.status.conditions[?(@.type=='Ready')].status,AGE:.metadata.creationTimestamp")

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var nodes []cluster.NodeInfo

	for _, line := range lines {
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) >= 4 {
			role := "worker"
			if fields[1] != "<none>" && fields[1] != "" {
				role = "control-plane"
			}

			status := "NotReady"
			if fields[2] == "True" {
				status = "Ready"
			}

			// Parse age from timestamp
			age := "unknown"
			if len(fields) > 3 {
				age = k.parseAge(fields[3])
			}

			nodes = append(nodes, cluster.NodeInfo{
				Name:   fields[0],
				Role:   role,
				Status: status,
				Age:    age,
			})
		}
	}

	return nodes, nil
}

// parseAge converts a timestamp to a human-readable age
func (k *K3dProvider) parseAge(timestamp string) string {
	// Parse timestamp format: 2024-01-01T12:00:00Z
	t, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		return "unknown"
	}

	duration := time.Since(t)
	if duration < time.Minute {
		return fmt.Sprintf("%ds", int(duration.Seconds()))
	} else if duration < time.Hour {
		return fmt.Sprintf("%dm", int(duration.Minutes()))
	} else if duration < 24*time.Hour {
		return fmt.Sprintf("%dh", int(duration.Hours()))
	} else {
		return fmt.Sprintf("%dd", int(duration.Hours()/24))
	}
}
