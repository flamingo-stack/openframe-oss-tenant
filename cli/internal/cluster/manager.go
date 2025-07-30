package cluster

import (
	"context"
	"fmt"
)

// Manager provides cluster management operations across different providers
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

// ListAllClusters returns all clusters from all available providers
func (m *Manager) ListAllClusters(ctx context.Context) ([]*ClusterInfo, error) {
	var allClusters []*ClusterInfo

	for _, provider := range m.providers {
		if provider.IsAvailable() == nil {
			if clusters, err := provider.List(ctx); err == nil {
				allClusters = append(allClusters, clusters...)
			}
		}
	}

	return allClusters, nil
}

// DetectClusterType determines the type of a cluster by name
func (m *Manager) DetectClusterType(ctx context.Context, name string) (ClusterType, error) {
	for clusterType, provider := range m.providers {
		if provider.IsAvailable() == nil {
			if clusters, err := provider.List(ctx); err == nil {
				for _, c := range clusters {
					if c.Name == name {
						return clusterType, nil
					}
				}
			}
		}
	}

	return "", fmt.Errorf("cluster '%s' not found", name)
}

// GetProvider returns the provider for a specific cluster type
func (m *Manager) GetProvider(clusterType ClusterType) (ClusterProvider, error) {
	provider, exists := m.providers[clusterType]
	if !exists {
		return nil, fmt.Errorf("unsupported cluster type: %s", clusterType)
	}
	return provider, nil
}

