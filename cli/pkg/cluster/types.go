package cluster

import (
	"context"
	"time"
)

// ClusterType represents the type of Kubernetes cluster
type ClusterType string

const (
	ClusterTypeKind ClusterType = "kind"
	ClusterTypeK3d  ClusterType = "k3d"
	ClusterTypeGKE  ClusterType = "gke"
	ClusterTypeEKS  ClusterType = "eks"
)

// ClusterConfig holds configuration for cluster creation
type ClusterConfig struct {
	Name              string                 `json:"name"`
	Type              ClusterType            `json:"type"`
	KubernetesVersion string                 `json:"kubernetesVersion,omitempty"`
	NodeCount         int                    `json:"nodeCount,omitempty"`
	PortMappings      []PortMapping          `json:"portMappings,omitempty"`
	ExtraConfig       map[string]interface{} `json:"extraConfig,omitempty"`
}

// PortMapping represents port mappings for local clusters
type PortMapping struct {
	HostPort      int    `json:"hostPort"`
	ContainerPort int    `json:"containerPort"`
	Protocol      string `json:"protocol,omitempty"`
}

// ClusterInfo represents information about an existing cluster
type ClusterInfo struct {
	Name       string      `json:"name"`
	Type       ClusterType `json:"type"`
	Status     string      `json:"status"`
	CreatedAt  time.Time   `json:"createdAt"`
	Kubeconfig string      `json:"kubeconfig"`
	Nodes      []NodeInfo  `json:"nodes"`
}

// NodeInfo represents information about a cluster node
type NodeInfo struct {
	Name   string `json:"name"`
	Role   string `json:"role"`
	Status string `json:"status"`
	Age    string `json:"age"`
}

// ClusterProvider interface defines the operations for managing clusters
type ClusterProvider interface {
	// Create creates a new cluster with the given configuration
	Create(ctx context.Context, config *ClusterConfig) error

	// Delete removes the cluster
	Delete(ctx context.Context, name string) error

	// List returns all clusters managed by this provider
	List(ctx context.Context) ([]*ClusterInfo, error)

	// GetKubeconfig returns the kubeconfig for the cluster
	GetKubeconfig(ctx context.Context, name string) (string, error)

	// Status returns the current status of the cluster
	Status(ctx context.Context, name string) (*ClusterInfo, error)

	// IsAvailable checks if the provider tools are installed and available
	IsAvailable() error

	// GetSupportedVersions returns the supported Kubernetes versions
	GetSupportedVersions() []string
}

// ProviderOptions holds options for provider creation
type ProviderOptions struct {
	Verbose bool
	DryRun  bool
}
