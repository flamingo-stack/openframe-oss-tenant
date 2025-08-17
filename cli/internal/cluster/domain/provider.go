package domain

import "context"

// ClusterProvider defines the contract for cluster provider implementations
// This is a domain interface that defines what cluster providers must do
type ClusterProvider interface {
	// Create creates a new cluster with the given configuration
	Create(ctx context.Context, config ClusterConfig) error
	
	// Delete removes a cluster by name
	Delete(ctx context.Context, name string, force bool) error
	
	// Start starts a stopped cluster
	Start(ctx context.Context, name string) error
	
	// List returns all clusters managed by this provider
	List(ctx context.Context) ([]ClusterInfo, error)
	
	// Status returns detailed status information for a specific cluster
	Status(ctx context.Context, name string) (ClusterInfo, error)
	
	// DetectType checks if this provider manages the given cluster
	DetectType(ctx context.Context, name string) (ClusterType, error)
	
	// GetKubeconfig returns the kubeconfig for accessing the cluster
	GetKubeconfig(ctx context.Context, name string) (string, error)
}

// ClusterService defines the business logic interface for cluster operations
// This represents the use cases that the application supports
type ClusterService interface {
	// CreateCluster creates a new cluster using the configured provider
	CreateCluster(ctx context.Context, config ClusterConfig) error
	
	// DeleteCluster removes a cluster
	DeleteCluster(ctx context.Context, name string, clusterType ClusterType, force bool) error
	
	// StartCluster starts a stopped cluster
	StartCluster(ctx context.Context, name string, clusterType ClusterType) error
	
	// ListClusters returns all available clusters
	ListClusters(ctx context.Context) ([]ClusterInfo, error)
	
	// GetClusterStatus returns detailed status for a cluster
	GetClusterStatus(ctx context.Context, name string) (ClusterInfo, error)
	
	// DetectClusterType determines what type of cluster this is
	DetectClusterType(ctx context.Context, name string) (ClusterType, error)
}

// ProviderRegistry manages the available cluster providers
type ProviderRegistry interface {
	// RegisterProvider adds a provider for a specific cluster type
	RegisterProvider(clusterType ClusterType, provider ClusterProvider)
	
	// GetProvider returns the provider for a given cluster type
	GetProvider(clusterType ClusterType) (ClusterProvider, error)
	
	// GetAllProviders returns all registered providers
	GetAllProviders() map[ClusterType]ClusterProvider
}