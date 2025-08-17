package testutil

import (
	"github.com/flamingo/openframe/internal/cluster/domain"
)

// TestClusterConfig creates a test cluster configuration
func TestClusterConfig(name string) *domain.ClusterConfig {
	return &domain.ClusterConfig{
		Name:       name,
		Type:       domain.ClusterTypeK3d,
		NodeCount:  3,
		K8sVersion: "v1.28.0",
	}
}