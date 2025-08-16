package factory

import (
	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/cluster/providers"
)

// CreateDefaultClusterManager creates a cluster manager with all default providers configured
// This function belongs in the factory package to avoid import cycles while providing
// a centralized place for dependency injection and provider registration.
func CreateDefaultClusterManager() *cluster.Manager {
	manager := cluster.NewManager()
	
	// Register K3d provider
	k3dProvider := providers.NewK3dProvider(cluster.ProviderOptions{})
	manager.RegisterProvider(cluster.ClusterTypeK3d, k3dProvider)
	
	// Future: Register other providers like GKE, EKS, etc.
	// gkeProvider := providers.NewGKEProvider(cluster.ProviderOptions{})
	// manager.RegisterProvider(cluster.ClusterTypeGKE, gkeProvider)
	
	return manager
}