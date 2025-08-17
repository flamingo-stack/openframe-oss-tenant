package cluster

import (
	"context"
	
	"github.com/flamingo/openframe-cli/internal/cluster/domain"
	"github.com/flamingo/openframe-cli/internal/common/utils"
)

// Re-export domain types for consistency
// All actual type definitions are in the domain package
type ClusterType = domain.ClusterType
type ClusterConfig = domain.ClusterConfig
type ClusterInfo = domain.ClusterInfo
type NodeInfo = domain.NodeInfo
type ProviderOptions = domain.ProviderOptions
type K3dOptions = domain.K3dOptions
type GKEOptions = domain.GKEOptions
type EKSOptions = domain.EKSOptions

// Re-export domain constants
const (
	ClusterTypeK3d = domain.ClusterTypeK3d
	ClusterTypeGKE = domain.ClusterTypeGKE
	ClusterTypeEKS = domain.ClusterTypeEKS
)

// Re-export domain flag types for consistency
type GlobalFlags = domain.GlobalFlags
type CreateFlags = domain.CreateFlags
type ListFlags = domain.ListFlags
type StatusFlags = domain.StatusFlags
type DeleteFlags = domain.DeleteFlags
type StartFlags = domain.StartFlags
type CleanupFlags = domain.CleanupFlags

// FlagContainer holds all flag structures needed by cluster commands
// This approach keeps compatibility with existing cmd layer while adding test capabilities
type FlagContainer struct {
	// Flag instances - now defined directly in this package
	Global  *GlobalFlags  `json:"global"`
	Create  *CreateFlags  `json:"create"`
	List    *ListFlags    `json:"list"`
	Status  *StatusFlags  `json:"status"`
	Delete  *DeleteFlags  `json:"delete"`
	Start   *StartFlags   `json:"start"`
	Cleanup *CleanupFlags `json:"cleanup"`
	
	// Dependencies for testing and execution
	Executor    utils.CommandExecutor `json:"-"` // Command executor for external commands
	TestManager *K3dManager           `json:"-"` // Test K3D cluster manager for unit tests
}

// NewFlagContainer creates a new flag container with initialized flags
func NewFlagContainer() *FlagContainer {
	return &FlagContainer{
		Global:  &domain.GlobalFlags{},
		Create:  &domain.CreateFlags{ClusterType: "k3d", NodeCount: 3, K8sVersion: "v1.31.5-k3s1"},
		List:    &domain.ListFlags{},
		Status:  &domain.StatusFlags{},
		Delete:  &domain.DeleteFlags{},
		Start:   &domain.StartFlags{},
		Cleanup: &domain.CleanupFlags{},
	}
}

// SyncGlobalFlags synchronizes global flags across all command-specific flags  
func (f *FlagContainer) SyncGlobalFlags() {
	if f.Global != nil {
		f.Create.GlobalFlags = *f.Global
		f.List.GlobalFlags = *f.Global
		f.Status.GlobalFlags = *f.Global
		f.Delete.GlobalFlags = *f.Global
		f.Start.GlobalFlags = *f.Global
		f.Cleanup.GlobalFlags = *f.Global
	}
}

// Reset resets all flags to their zero values (for testing)
func (f *FlagContainer) Reset() {
	f.Global = &domain.GlobalFlags{}
	f.Create = &domain.CreateFlags{} // Empty for reset, defaults are set in NewFlagContainer
	f.List = &domain.ListFlags{}
	f.Status = &domain.StatusFlags{}
	f.Delete = &domain.DeleteFlags{}
	f.Start = &domain.StartFlags{}
	f.Cleanup = &domain.CleanupFlags{}
}

// Command interfaces - using utils.CommandExecutor for consistency

type ClusterCommand interface {
	GetCommand(flags *FlagContainer) interface{}
	Validate(flags *FlagContainer) error
}

// ClusterProvider defines the contract for cluster provider implementations
// Kept temporarily for test compatibility - will be removed in Phase 4
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
// Simplified interface that matches the actual Manager implementation
type ClusterService interface {
	// CreateCluster creates a new cluster
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

// Re-export domain error types for consistency
type ErrClusterNotFound = domain.ErrClusterNotFound
type ErrProviderNotFound = domain.ErrProviderNotFound
type ErrInvalidClusterConfig = domain.ErrInvalidClusterConfig
type ErrClusterAlreadyExists = domain.ErrClusterAlreadyExists
type ErrClusterOperation = domain.ErrClusterOperation

// Re-export domain error constructor functions
var (
	NewClusterNotFoundError     = domain.NewClusterNotFoundError
	NewProviderNotFoundError    = domain.NewProviderNotFoundError
	NewInvalidConfigError       = domain.NewInvalidConfigError
	NewClusterAlreadyExistsError = domain.NewClusterAlreadyExistsError
	NewClusterOperationError    = domain.NewClusterOperationError
)