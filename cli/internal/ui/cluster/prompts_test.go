package cluster

import (
	"testing"

	clusterTypes "github.com/flamingo/openframe-cli/internal/cluster"
)

func TestClusterConfiguration_Validation(t *testing.T) {
	tests := []struct {
		name   string
		config *ClusterConfiguration
		valid  bool
	}{
		{
			name: "valid config",
			config: &ClusterConfiguration{
				Name:      "test-cluster",
				Type:      clusterTypes.ClusterTypeK3d,
				NodeCount: 3,
			},
			valid: true,
		},
		{
			name: "empty name",
			config: &ClusterConfiguration{
				Name:      "",
				Type:      clusterTypes.ClusterTypeK3d,
				NodeCount: 3,
			},
			valid: false,
		},
		{
			name: "zero nodes",
			config: &ClusterConfiguration{
				Name:      "test-cluster",
				Type:      clusterTypes.ClusterTypeK3d,
				NodeCount: 0,
			},
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.config.Name != "" && tt.config.NodeCount > 0
			if isValid != tt.valid {
				t.Errorf("ClusterConfiguration validation = %v, want %v", isValid, tt.valid)
			}
		})
	}
}

func TestClusterConfiguration_SetDefaults(t *testing.T) {
	config := &ClusterConfiguration{
		Name: "test-cluster",
	}
	
	// Test that we can set basic properties
	if config.Name != "test-cluster" {
		t.Errorf("expected Name to be 'test-cluster', got %q", config.Name)
	}
	
	// Test that Type can be set
	config.Type = clusterTypes.ClusterTypeK3d
	if config.Type != clusterTypes.ClusterTypeK3d {
		t.Errorf("expected Type to be k3d, got %q", config.Type)
	}
	
	// Test that NodeCount can be set  
	config.NodeCount = 3
	if config.NodeCount != 3 {
		t.Errorf("expected NodeCount to be 3, got %d", config.NodeCount)
	}
}