package factory

import (
	"context"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/stretchr/testify/assert"
)

func TestCreateDefaultClusterManager(t *testing.T) {
	manager := CreateDefaultClusterManager()
	
	// Verify manager is created
	assert.NotNil(t, manager)
	
	// Verify K3d provider is registered
	k3dProvider, err := manager.GetProvider(cluster.ClusterTypeK3d)
	assert.NoError(t, err)
	assert.NotNil(t, k3dProvider)
	
	// Test that we can call a method on the provider
	// Use a simple method that doesn't require external dependencies
	_, err = k3dProvider.List(context.Background())
	// Note: This might fail if k3d is not installed, but we just test the structure
	if err != nil {
		// This is acceptable - we're testing the factory structure, not k3d availability
		t.Logf("K3d not available in test environment: %v", err)
	}
}

func TestCreateDefaultClusterManager_ProviderTypes(t *testing.T) {
	manager := CreateDefaultClusterManager()
	
	// Test that we can get K3d provider specifically
	provider, err := manager.GetProvider(cluster.ClusterTypeK3d)
	assert.NoError(t, err)
	assert.NotNil(t, provider)
	
	// Test that getting a non-existent provider returns error
	_, err = manager.GetProvider("non-existent-type")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "provider not found")
}

func TestCreateDefaultClusterManager_Multiple(t *testing.T) {
	// Test that multiple calls create independent managers
	manager1 := CreateDefaultClusterManager()
	manager2 := CreateDefaultClusterManager()
	
	assert.NotNil(t, manager1)
	assert.NotNil(t, manager2)
	
	// They should be different instances
	assert.NotSame(t, manager1, manager2)
	
	// But both should have K3d provider
	provider1, err1 := manager1.GetProvider(cluster.ClusterTypeK3d)
	provider2, err2 := manager2.GetProvider(cluster.ClusterTypeK3d)
	
	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.NotNil(t, provider1)
	assert.NotNil(t, provider2)
}

// Benchmark factory creation
func BenchmarkCreateDefaultClusterManager(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CreateDefaultClusterManager()
	}
}