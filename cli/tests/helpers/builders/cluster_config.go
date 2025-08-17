package builders

import (
	"github.com/flamingo/openframe-cli/internal/cluster"
)

// ClusterConfigBuilder provides a fluent interface for building test cluster configurations
type ClusterConfigBuilder struct {
	config *cluster.ClusterConfig
}

// NewClusterConfig creates a new cluster config builder with defaults
func NewClusterConfig() *ClusterConfigBuilder {
	return &ClusterConfigBuilder{
		config: &cluster.ClusterConfig{
			Name:       "test-cluster",
			Type:       cluster.ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "v1.28.0",
		},
	}
}

// WithName sets the cluster name
func (b *ClusterConfigBuilder) WithName(name string) *ClusterConfigBuilder {
	b.config.Name = name
	return b
}

// WithType sets the cluster type
func (b *ClusterConfigBuilder) WithType(clusterType cluster.ClusterType) *ClusterConfigBuilder {
	b.config.Type = clusterType
	return b
}

// WithNodeCount sets the number of nodes
func (b *ClusterConfigBuilder) WithNodeCount(count int) *ClusterConfigBuilder {
	b.config.NodeCount = count
	return b
}

// WithK8sVersion sets the Kubernetes version
func (b *ClusterConfigBuilder) WithK8sVersion(version string) *ClusterConfigBuilder {
	b.config.K8sVersion = version
	return b
}

// Build returns the built cluster configuration
func (b *ClusterConfigBuilder) Build() *cluster.ClusterConfig {
	// Return a copy to prevent mutations
	return &cluster.ClusterConfig{
		Name:       b.config.Name,
		Type:       b.config.Type,
		NodeCount:  b.config.NodeCount,
		K8sVersion: b.config.K8sVersion,
	}
}

// Common pre-built configurations

// DefaultK3dConfig returns a default k3d cluster configuration
func DefaultK3dConfig() *cluster.ClusterConfig {
	return NewClusterConfig().
		WithName("test-k3d").
		WithType(cluster.ClusterTypeK3d).
		WithNodeCount(3).
		WithK8sVersion("v1.28.0").
		Build()
}

// MinimalK3dConfig returns a minimal k3d cluster configuration
func MinimalK3dConfig() *cluster.ClusterConfig {
	return NewClusterConfig().
		WithName("test-minimal").
		WithType(cluster.ClusterTypeK3d).
		WithNodeCount(1).
		WithK8sVersion("v1.28.0").
		Build()
}

// CustomConfig returns a builder for custom configurations
func CustomConfig(name string) *ClusterConfigBuilder {
	return NewClusterConfig().WithName(name)
}