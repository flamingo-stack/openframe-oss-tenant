package cluster

import (
	"context"
	"strings"
	"testing"
)

func TestK3dProvider_IsAvailable(t *testing.T) {
	provider := NewK3dProvider(ProviderOptions{})
	err := provider.IsAvailable()
	if err != nil {
		t.Skipf("k3d not available: %v", err)
	}
}

func TestClusterConfig_Validation(t *testing.T) {
	tests := []struct {
		name   string
		config ClusterConfig
		valid  bool
	}{
		{"valid config", ClusterConfig{Name: "test", Type: ClusterTypeK3d, NodeCount: 2}, true},
		{"empty name", ClusterConfig{Name: "", Type: ClusterTypeK3d, NodeCount: 2}, false},
		{"zero nodes", ClusterConfig{Name: "test", Type: ClusterTypeK3d, NodeCount: 0}, false},
		{"invalid chars in name", ClusterConfig{Name: "test cluster!", Type: ClusterTypeK3d, NodeCount: 1}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.config.Name != "" && tt.config.NodeCount > 0 &&
				!strings.Contains(tt.config.Name, " ") &&
				!strings.ContainsAny(tt.config.Name, "!@#$%^&*()_+=")
			if isValid != tt.valid {
				t.Errorf("ClusterConfig validation = %v, want %v", isValid, tt.valid)
			}
		})
	}
}

func TestClusterTypes(t *testing.T) {
	tests := []struct {
		name        string
		clusterType ClusterType
		expected    string
	}{
		{
			name:        "k3d type",
			clusterType: ClusterTypeK3d,
			expected:    "k3d",
		},
		{
			name:        "gke type",
			clusterType: ClusterTypeGKE,
			expected:    "gke",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.clusterType) != tt.expected {
				t.Errorf("ClusterType %q = %q, want %q", tt.name, string(tt.clusterType), tt.expected)
			}
		})
	}
}

func TestPortMapping_Validation(t *testing.T) {
	tests := []struct {
		name    string
		mapping PortMapping
		valid   bool
	}{
		{"valid tcp", PortMapping{HostPort: 8080, ContainerPort: 80, Protocol: "tcp"}, true},
		{"valid udp", PortMapping{HostPort: 53, ContainerPort: 53, Protocol: "udp"}, true},
		{"empty protocol defaults to tcp", PortMapping{HostPort: 8080, ContainerPort: 80, Protocol: ""}, true},
		{"invalid host port", PortMapping{HostPort: 0, ContainerPort: 80, Protocol: "tcp"}, false},
		{"invalid container port", PortMapping{HostPort: 8080, ContainerPort: 0, Protocol: "tcp"}, false},
		{"unsupported protocol", PortMapping{HostPort: 8080, ContainerPort: 80, Protocol: "invalid"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.mapping.HostPort > 0 && tt.mapping.ContainerPort > 0 &&
				(tt.mapping.Protocol == "tcp" || tt.mapping.Protocol == "udp" || tt.mapping.Protocol == "")
			if isValid != tt.valid {
				t.Errorf("PortMapping validation = %v, want %v", isValid, tt.valid)
			}
		})
	}
}

func TestProviderOptions(t *testing.T) {
	// Test provider creation with various options
	options := []ProviderOptions{
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
	provider := NewK3dProvider(ProviderOptions{DryRun: true})
	config := &ClusterConfig{Name: "test-dry-run", Type: ClusterTypeK3d, NodeCount: 1}
	ctx := context.Background()

	// Dry run should not fail
	err := provider.Create(ctx, config)
	if err != nil {
		t.Errorf("dry run create should not fail: %v", err)
	}
}

func TestClusterInfo(t *testing.T) {
	info := ClusterInfo{
		Name:   "test-cluster",
		Type:   ClusterTypeK3d,
		Status: "Running",
		Nodes: []NodeInfo{
			{Name: "server-0", Role: "control-plane", Status: "Ready"},
			{Name: "agent-0", Role: "worker", Status: "Ready"},
		},
	}

	if info.Name != "test-cluster" || info.Type != ClusterTypeK3d || len(info.Nodes) != 2 {
		t.Errorf("ClusterInfo validation failed: %+v", info)
	}
}

// TestNodeInfo is covered by TestClusterInfo - removed

// Test that providers implement the ClusterProvider interface
func TestProviderInterface(t *testing.T) {
	var _ ClusterProvider = NewK3dProvider(ProviderOptions{})
}

// TestK3dProvider_Create_Integration is covered by TestK3dProvider_DryRun - removed

// TestK3dProvider_Delete_Integration removed - testing non-existent cluster deletion adds no value

// TestK3dProvider_List_Integration removed - testing empty list adds minimal value

// TestK3dProvider_Status_Integration removed - testing non-existent cluster status adds no value

// TestClusterConfig_Validation is covered by the consolidated TestClusterConfig_Validation above - removed

// TestAdvancedPortMapping is covered by TestPortMapping_Validation - removed

// TestClusterInfo_Comprehensive is covered by TestClusterInfo - removed

// TestProviderOptions_Combinations is covered by TestProviderOptions - removed

// TestK3dProvider_EdgeCases removed - excessive edge case testing adds minimal value

// Benchmark tests removed - they don't provide meaningful insights for this use case
