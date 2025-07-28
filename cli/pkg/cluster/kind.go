package cluster

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"sigs.k8s.io/kind/pkg/apis/config/v1alpha4"
	"sigs.k8s.io/kind/pkg/cluster"
)

// KindProvider implements ClusterProvider for Kind clusters
type KindProvider struct {
	provider *cluster.Provider
	options  ProviderOptions
}

// NewKindProvider creates a new Kind cluster provider
func NewKindProvider(opts ProviderOptions) *KindProvider {
	return &KindProvider{
		provider: cluster.NewProvider(),
		options:  opts,
	}
}

// Create creates a new Kind cluster
func (k *KindProvider) Create(ctx context.Context, config *ClusterConfig) error {
	// Check if cluster already exists
	clusters, err := k.provider.List()
	if err != nil {
		return fmt.Errorf("failed to list existing clusters: %w", err)
	}

	for _, cluster := range clusters {
		if cluster == config.Name {
			return fmt.Errorf("cluster %s already exists", config.Name)
		}
	}

	// Create Kind configuration
	kindConfig := &v1alpha4.Cluster{
		TypeMeta: v1alpha4.TypeMeta{
			Kind:       "Cluster",
			APIVersion: "kind.x-k8s.io/v1alpha4",
		},
		Name: config.Name,
	}

	// Configure nodes
	nodeCount := config.NodeCount
	if nodeCount == 0 {
		nodeCount = 1 // Default to single node
	}

	// Control plane node
	kindConfig.Nodes = append(kindConfig.Nodes, v1alpha4.Node{
		Role: v1alpha4.ControlPlaneRole,
	})

	// Worker nodes
	for i := 1; i < nodeCount; i++ {
		kindConfig.Nodes = append(kindConfig.Nodes, v1alpha4.Node{
			Role: v1alpha4.WorkerRole,
		})
	}

	// Configure port mappings if specified
	if len(config.PortMappings) > 0 && len(kindConfig.Nodes) > 0 {
		var portMappings []v1alpha4.PortMapping
		for _, pm := range config.PortMappings {
			portMappings = append(portMappings, v1alpha4.PortMapping{
				ContainerPort: int32(pm.ContainerPort),
				HostPort:      int32(pm.HostPort),
				Protocol:      v1alpha4.PortMappingProtocol(pm.Protocol),
			})
		}
		kindConfig.Nodes[0].ExtraPortMappings = portMappings
	}

	// Set Kubernetes version if specified
	if config.KubernetesVersion != "" {
		for i := range kindConfig.Nodes {
			kindConfig.Nodes[i].Image = fmt.Sprintf("kindest/node:%s", config.KubernetesVersion)
		}
	}

	// Create the cluster
	err = k.provider.Create(
		config.Name,
		cluster.CreateWithV1Alpha4Config(kindConfig),
		cluster.CreateWithWaitForReady(5*time.Minute),
	)
	if err != nil {
		return fmt.Errorf("failed to create Kind cluster: %w", err)
	}

	return nil
}

// Delete removes a Kind cluster
func (k *KindProvider) Delete(ctx context.Context, name string) error {
	return k.provider.Delete(name, "")
}

// List returns all Kind clusters
func (k *KindProvider) List(ctx context.Context) ([]*ClusterInfo, error) {
	clusters, err := k.provider.List()
	if err != nil {
		return nil, fmt.Errorf("failed to list Kind clusters: %w", err)
	}

	var result []*ClusterInfo
	for _, cluster := range clusters {
		info, err := k.Status(ctx, cluster)
		if err != nil {
			continue // Skip clusters we can't get status for
		}
		result = append(result, info)
	}

	return result, nil
}

// GetKubeconfig returns the kubeconfig for a Kind cluster
func (k *KindProvider) GetKubeconfig(ctx context.Context, name string) (string, error) {
	return k.provider.KubeConfig(name, false)
}

// Status returns the status of a Kind cluster
func (k *KindProvider) Status(ctx context.Context, name string) (*ClusterInfo, error) {
	// Check if cluster exists
	clusters, err := k.provider.List()
	if err != nil {
		return nil, fmt.Errorf("failed to list clusters: %w", err)
	}

	found := false
	for _, cluster := range clusters {
		if cluster == name {
			found = true
			break
		}
	}

	if !found {
		return nil, fmt.Errorf("cluster %s not found", name)
	}

	// Get kubeconfig path
	kubeconfig, err := k.GetKubeconfig(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	// Get node information using kubectl
	nodes, err := k.getNodeInfo(name)
	if err != nil {
		nodes = []NodeInfo{} // Continue even if we can't get node info
	}

	return &ClusterInfo{
		Name:       name,
		Type:       ClusterTypeKind,
		Status:     "Running",  // Kind clusters are running if they exist
		CreatedAt:  time.Now(), // Kind doesn't provide creation time
		Kubeconfig: kubeconfig,
		Nodes:      nodes,
	}, nil
}

// IsAvailable checks if Kind is installed and available
func (k *KindProvider) IsAvailable() error {
	_, err := exec.LookPath("kind")
	if err != nil {
		return fmt.Errorf("kind is not installed or not in PATH")
	}
	return nil
}

// GetSupportedVersions returns supported Kubernetes versions for Kind
func (k *KindProvider) GetSupportedVersions() []string {
	// These are common Kind node image versions
	return []string{
		"v1.29.0",
		"v1.28.0",
		"v1.27.3",
		"v1.26.6",
		"v1.25.11",
	}
}

// getNodeInfo retrieves node information using kubectl
func (k *KindProvider) getNodeInfo(clusterName string) ([]NodeInfo, error) {
	kubeconfig, err := k.GetKubeconfig(context.Background(), clusterName)
	if err != nil {
		return nil, err
	}

	// Write kubeconfig to temp file and use kubectl
	// This is a simplified version - in production, you'd use the Kubernetes client-go library
	cmd := exec.Command("kubectl", "get", "nodes", "--no-headers", "-o", "custom-columns=NAME:.metadata.name,ROLES:.metadata.labels.node-role\\.kubernetes\\.io/control-plane,STATUS:.status.conditions[-1].type,AGE:.metadata.creationTimestamp")
	cmd.Env = append(cmd.Env, fmt.Sprintf("KUBECONFIG=%s", kubeconfig))

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get node information: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	var nodes []NodeInfo

	for _, line := range lines {
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) >= 4 {
			role := "worker"
			if fields[1] != "<none>" {
				role = "control-plane"
			}

			nodes = append(nodes, NodeInfo{
				Name:   fields[0],
				Role:   role,
				Status: fields[2],
				Age:    fields[3],
			})
		}
	}

	return nodes, nil
}
