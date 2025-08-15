package cluster

import (
	"context"
	"fmt"
	"time"
)

// ClusterType represents different types of Kubernetes clusters
type ClusterType string

const (
	ClusterTypeK3d ClusterType = "k3d"
	ClusterTypeGKE ClusterType = "gke"
	ClusterTypeEKS ClusterType = "eks"
)

// ClusterConfig represents configuration for creating a cluster
type ClusterConfig struct {
	Name       string
	Type       ClusterType
	NodeCount  int
	K8sVersion string
}

// ClusterInfo represents information about an existing cluster
type ClusterInfo struct {
	Name       string
	Type       ClusterType
	Status     string
	NodeCount  int
	K8sVersion string
	CreatedAt  time.Time
	Nodes      []NodeInfo
}

// NodeInfo represents information about a cluster node
type NodeInfo struct {
	Name   string
	Status string
	Role   string
	Age    time.Duration
}

// ProviderOptions contains options for cluster providers
type ProviderOptions struct {
	Verbose bool
	DryRun  bool
}

// ClusterProvider is an interface for different cluster providers
type ClusterProvider interface {
	Create(ctx context.Context, config ClusterConfig) error
	Delete(ctx context.Context, name string, force bool) error
	Start(ctx context.Context, name string) error
	List(ctx context.Context) ([]ClusterInfo, error)
	Status(ctx context.Context, name string) (ClusterInfo, error)
	DetectType(ctx context.Context, name string) (ClusterType, error)
	GetKubeconfig(ctx context.Context, name string) (string, error)
}

// Manager manages different cluster providers
type Manager struct {
	providers map[ClusterType]ClusterProvider
}

// NewManager creates a new cluster manager
func NewManager() *Manager {
	return &Manager{
		providers: make(map[ClusterType]ClusterProvider),
	}
}

// RegisterProvider registers a cluster provider
func (m *Manager) RegisterProvider(clusterType ClusterType, provider ClusterProvider) {
	m.providers[clusterType] = provider
}

// GetProvider returns a provider for the given cluster type
func (m *Manager) GetProvider(clusterType ClusterType) (ClusterProvider, error) {
	provider, exists := m.providers[clusterType]
	if !exists {
		return nil, fmt.Errorf("provider not found for cluster type: %s", clusterType)
	}
	return provider, nil
}

// DetectClusterType attempts to detect the type of an existing cluster
func (m *Manager) DetectClusterType(ctx context.Context, name string) (ClusterType, error) {
	// Try each provider to see which one recognizes the cluster
	for _, provider := range m.providers {
		if detectedType, err := provider.DetectType(ctx, name); err == nil {
			return detectedType, nil
		}
	}
	
	// If no provider recognizes it, default to k3d for now
	return ClusterTypeK3d, nil
}

// CreateCluster creates a cluster using the appropriate provider
func (m *Manager) CreateCluster(ctx context.Context, config ClusterConfig) error {
	provider, err := m.GetProvider(config.Type)
	if err != nil {
		return err
	}
	return provider.Create(ctx, config)
}

// DeleteCluster deletes a cluster using the appropriate provider
func (m *Manager) DeleteCluster(ctx context.Context, name string, clusterType ClusterType, force bool) error {
	provider, err := m.GetProvider(clusterType)
	if err != nil {
		return err
	}
	return provider.Delete(ctx, name, force)
}

// StartCluster starts a cluster using the appropriate provider
func (m *Manager) StartCluster(ctx context.Context, name string, clusterType ClusterType) error {
	provider, err := m.GetProvider(clusterType)
	if err != nil {
		return err
	}
	return provider.Start(ctx, name)
}

// ListClusters lists all clusters from all providers
func (m *Manager) ListClusters(ctx context.Context) ([]ClusterInfo, error) {
	var allClusters []ClusterInfo
	
	for _, provider := range m.providers {
		clusters, err := provider.List(ctx)
		if err != nil {
			// Continue with other providers if one fails
			continue
		}
		allClusters = append(allClusters, clusters...)
	}
	
	return allClusters, nil
}

// ListAllClusters is an alias for ListClusters for backward compatibility
func (m *Manager) ListAllClusters(ctx context.Context) ([]ClusterInfo, error) {
	return m.ListClusters(ctx)
}

// GetClusterStatus gets status for a specific cluster
func (m *Manager) GetClusterStatus(ctx context.Context, name string, clusterType ClusterType) (ClusterInfo, error) {
	provider, err := m.GetProvider(clusterType)
	if err != nil {
		return ClusterInfo{}, err
	}
	return provider.Status(ctx, name)
}