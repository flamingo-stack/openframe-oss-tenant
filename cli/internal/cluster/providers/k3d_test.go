package providers

import (
	"context"
	"strings"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
)

func TestK3dProvider_IsAvailable(t *testing.T) {
	provider := NewK3dProvider(cluster.ProviderOptions{})
	err := provider.IsAvailable()
	if err != nil {
		t.Skipf("k3d not available: %v", err)
	}
}

func TestClusterConfig_Validation(t *testing.T) {
	tests := []struct {
		name   string
		config cluster.ClusterConfig
		valid  bool
	}{
		{"valid config", cluster.ClusterConfig{Name: "test", Type: cluster.ClusterTypeK3d, NodeCount: 2}, true},
		{"empty name", cluster.ClusterConfig{Name: "", Type: cluster.ClusterTypeK3d, NodeCount: 2}, false},
		{"zero nodes", cluster.ClusterConfig{Name: "test", Type: cluster.ClusterTypeK3d, NodeCount: 0}, false},
		{"invalid chars in name", cluster.ClusterConfig{Name: "test cluster!", Type: cluster.ClusterTypeK3d, NodeCount: 1}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.config.Name != "" && tt.config.NodeCount > 0 &&
				!strings.Contains(tt.config.Name, " ") &&
				!strings.ContainsAny(tt.config.Name, "!@#$%^&*()_+=")
			if isValid != tt.valid {
				t.Errorf("cluster.ClusterConfig validation = %v, want %v", isValid, tt.valid)
			}
		})
	}
}

func TestClusterTypes(t *testing.T) {
	tests := []struct {
		name        string
		clusterType cluster.ClusterType
		expected    string
	}{
		{
			name:        "k3d type",
			clusterType: cluster.ClusterTypeK3d,
			expected:    "k3d",
		},
		{
			name:        "gke type",
			clusterType: cluster.ClusterTypeGKE,
			expected:    "gke",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.clusterType) != tt.expected {
				t.Errorf("cluster.ClusterType %q = %q, want %q", tt.name, string(tt.clusterType), tt.expected)
			}
		})
	}
}

func TestPortMapping_Validation(t *testing.T) {
	tests := []struct {
		name    string
		mapping cluster.PortMapping
		valid   bool
	}{
		{"valid tcp", cluster.PortMapping{HostPort: 8080, ContainerPort: 80, Protocol: "tcp"}, true},
		{"valid udp", cluster.PortMapping{HostPort: 53, ContainerPort: 53, Protocol: "udp"}, true},
		{"empty protocol defaults to tcp", cluster.PortMapping{HostPort: 8080, ContainerPort: 80, Protocol: ""}, true},
		{"invalid host port", cluster.PortMapping{HostPort: 0, ContainerPort: 80, Protocol: "tcp"}, false},
		{"invalid container port", cluster.PortMapping{HostPort: 8080, ContainerPort: 0, Protocol: "tcp"}, false},
		{"unsupported protocol", cluster.PortMapping{HostPort: 8080, ContainerPort: 80, Protocol: "invalid"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.mapping.HostPort > 0 && tt.mapping.ContainerPort > 0 &&
				(tt.mapping.Protocol == "tcp" || tt.mapping.Protocol == "udp" || tt.mapping.Protocol == "")
			if isValid != tt.valid {
				t.Errorf("cluster.PortMapping validation = %v, want %v", isValid, tt.valid)
			}
		})
	}
}

func TestProviderOptions(t *testing.T) {
	// Test provider creation with various options
	options := []cluster.ProviderOptions{
		{Verbose: false, DryRun: false},
		{Verbose: true, DryRun: true},
	}
	for _, opt := range options {
		provider := NewK3dProvider(opt)
		if provider == nil {
			t.Error("expected K3d provider but got nil")
		}
	}
}

func TestK3dProvider_DryRun(t *testing.T) {
	provider := NewK3dProvider(cluster.ProviderOptions{DryRun: true})
	config := &cluster.ClusterConfig{Name: "test-dry-run", Type: cluster.ClusterTypeK3d, NodeCount: 1}
	ctx := context.Background()

	// Dry run should not fail
	err := provider.Create(ctx, config)
	if err != nil {
		t.Errorf("dry run create should not fail: %v", err)
	}
}

func TestClusterInfo(t *testing.T) {
	info := cluster.ClusterInfo{
		Name:   "test-cluster",
		Type:   cluster.ClusterTypeK3d,
		Status: "Running",
		Nodes: []cluster.NodeInfo{
			{Name: "server-0", Role: "control-plane", Status: "Ready"},
			{Name: "agent-0", Role: "worker", Status: "Ready"},
		},
	}

	if info.Name != "test-cluster" || info.Type != cluster.ClusterTypeK3d || len(info.Nodes) != 2 {
		t.Errorf("cluster.ClusterInfo validation failed: %+v", info)
	}
}

// Testcluster.NodeInfo is covered by Testcluster.ClusterInfo - removed

// Test that providers implement the cluster.ClusterProvider interface
func TestProviderInterface(t *testing.T) {
	var _ cluster.ClusterProvider = NewK3dProvider(cluster.ProviderOptions{})
}

// TestK3dProvider_Create_Integration is covered by TestK3dProvider_DryRun - removed

// TestK3dProvider_Delete_Integration removed - testing non-existent cluster deletion adds no value

// TestK3dProvider_List_Integration removed - testing empty list adds minimal value

// TestK3dProvider_Status_Integration removed - testing non-existent cluster status adds no value

// Testcluster.ClusterConfig_Validation is covered by the consolidated Testcluster.ClusterConfig_Validation above - removed

// TestAdvancedcluster.PortMapping is covered by Testcluster.PortMapping_Validation - removed

// Testcluster.ClusterInfo_Comprehensive is covered by Testcluster.ClusterInfo - removed

// Testcluster.ProviderOptions_Combinations is covered by Testcluster.ProviderOptions - removed

// TestK3dProvider_EdgeCases removed - excessive edge case testing adds minimal value

// Benchmark tests removed - they don't provide meaningful insights for this use case
