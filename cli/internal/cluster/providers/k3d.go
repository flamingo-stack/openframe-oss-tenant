package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/flamingo/openframe-cli/internal/cluster"
)

// K3dProvider implements cluster operations for K3d clusters
type K3dProvider struct {
	options cluster.ProviderOptions
}


// NewK3dProvider creates a new K3d provider
func NewK3dProvider(options cluster.ProviderOptions) *K3dProvider {
	return &K3dProvider{
		options: options,
	}
}

// Create creates a new K3d cluster
func (p *K3dProvider) Create(ctx context.Context, config cluster.ClusterConfig) error {
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
	
	if p.options.Verbose {
		args = append(args, "--verbose")
	}
	
	cmd := exec.CommandContext(ctx, "k3d", args...)
	
	if p.options.DryRun {
		fmt.Printf("Would run: k3d %s\n", strings.Join(args, " "))
		return nil
	}
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to create k3d cluster: %w\nOutput: %s", err, string(output))
	}
	
	return nil
}

// Delete deletes a K3d cluster
func (p *K3dProvider) Delete(ctx context.Context, name string, force bool) error {
	args := []string{"cluster", "delete", name}
	
	if p.options.Verbose {
		args = append(args, "--verbose")
	}
	
	cmd := exec.CommandContext(ctx, "k3d", args...)
	
	if p.options.DryRun {
		fmt.Printf("Would run: k3d %s\n", strings.Join(args, " "))
		return nil
	}
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to delete k3d cluster: %w\nOutput: %s", err, string(output))
	}
	
	return nil
}

// Start starts a K3d cluster
func (p *K3dProvider) Start(ctx context.Context, name string) error {
	args := []string{"cluster", "start", name}
	
	if p.options.Verbose {
		args = append(args, "--verbose")
	}
	
	cmd := exec.CommandContext(ctx, "k3d", args...)
	
	if p.options.DryRun {
		fmt.Printf("Would run: k3d %s\n", strings.Join(args, " "))
		return nil
	}
	
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to start k3d cluster: %w\nOutput: %s", err, string(output))
	}
	
	return nil
}

// List lists all K3d clusters
func (p *K3dProvider) List(ctx context.Context) ([]cluster.ClusterInfo, error) {
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "list", "--output", "json")
	
	if p.options.DryRun {
		fmt.Println("Would run: k3d cluster list --output json")
		return []cluster.ClusterInfo{}, nil
	}
	
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list k3d clusters: %w", err)
	}
	
	var k3dClusters []K3dClusterInfo
	if err := json.Unmarshal(output, &k3dClusters); err != nil {
		return nil, fmt.Errorf("failed to parse k3d cluster list: %w", err)
	}
	
	var clusters []cluster.ClusterInfo
	for _, k3dCluster := range k3dClusters {
		clusters = append(clusters, cluster.ClusterInfo{
			Name:       k3dCluster.Name,
			Type:       cluster.ClusterTypeK3d,
			Status:     strings.ToLower(k3dCluster.ServersRunning) + "/" + strings.ToLower(k3dCluster.ServersCount),
			NodeCount:  parseNodeCount(k3dCluster.AgentsCount, k3dCluster.ServersCount),
			K8sVersion: k3dCluster.Image,
			CreatedAt:  time.Now(), // K3d doesn't provide created time in JSON - use current time as placeholder
			Nodes:      []cluster.NodeInfo{}, // TODO: populate with actual node info
		})
	}
	
	return clusters, nil
}

// Status gets the status of a K3d cluster
func (p *K3dProvider) Status(ctx context.Context, name string) (cluster.ClusterInfo, error) {
	clusters, err := p.List(ctx)
	if err != nil {
		return cluster.ClusterInfo{}, err
	}
	
	for _, clusterInfo := range clusters {
		if clusterInfo.Name == name {
			return clusterInfo, nil
		}
	}
	
	return cluster.ClusterInfo{}, fmt.Errorf("cluster '%s' not found", name)
}

// DetectType checks if a cluster is managed by K3d
func (p *K3dProvider) DetectType(ctx context.Context, name string) (cluster.ClusterType, error) {
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "get", name)
	
	if p.options.DryRun {
		fmt.Printf("Would run: k3d cluster get %s\n", name)
		return cluster.ClusterTypeK3d, nil
	}
	
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("cluster not found in k3d: %w", err)
	}
	
	return cluster.ClusterTypeK3d, nil
}

// K3dClusterInfo represents the JSON structure returned by k3d cluster list
type K3dClusterInfo struct {
	Name           string `json:"name"`
	ServersCount   string `json:"serversCount"`
	ServersRunning string `json:"serversRunning"`
	AgentsCount    string `json:"agentsCount"`
	AgentsRunning  string `json:"agentsRunning"`
	Image          string `json:"image"`
}

// GetKubeconfig retrieves the kubeconfig for a K3d cluster
func (p *K3dProvider) GetKubeconfig(ctx context.Context, name string) (string, error) {
	cmd := exec.CommandContext(ctx, "k3d", "kubeconfig", "get", name)
	
	if p.options.DryRun {
		fmt.Printf("Would run: k3d kubeconfig get %s\n", name)
		return "", nil
	}
	
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig for k3d cluster: %w", err)
	}
	
	return string(output), nil
}

// parseNodeCount combines servers and agents into total node count
func parseNodeCount(agents, servers string) int {
	agentCount, _ := strconv.Atoi(agents)
	serverCount, _ := strconv.Atoi(servers)
	return agentCount + serverCount
}

