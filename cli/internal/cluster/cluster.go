package cluster

// Re-export types and functions for backward compatibility
import (
	"github.com/flamingo/openframe-cli/internal/cluster/core"
)

// Re-export types
type ClusterType = core.ClusterType
type ClusterConfig = core.ClusterConfig
type ClusterInfo = core.ClusterInfo
type NodeInfo = core.NodeInfo
type ProviderOptions = core.ProviderOptions
type ClusterProvider = core.ClusterProvider
type Manager = core.Manager

// Re-export constants
const (
	ClusterTypeK3d = core.ClusterTypeK3d
	ClusterTypeGKE = core.ClusterTypeGKE
	ClusterTypeEKS = core.ClusterTypeEKS
)

// Re-export functions
var NewManager = core.NewManager