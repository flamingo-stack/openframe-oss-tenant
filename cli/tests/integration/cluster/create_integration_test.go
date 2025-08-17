package cluster_integration

import (
	"testing"

	"github.com/flamingo/openframe/tests/integration/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Integration test that actually creates and deletes a cluster
// This test requires k3d to be installed and Docker to be running
// If dependencies are missing, the test will pass with a warning message
func TestClusterCreate_RealCluster(t *testing.T) {
	// Check dependencies
	common.RequireClusterDependencies(t)

	clusterName := common.GenerateTestClusterName()
	
	// Cleanup function
	cleanup := func() {
		// Try to delete the cluster in case test fails
		common.CleanupTestCluster(clusterName)
	}
	defer cleanup()

	t.Run("create cluster", func(t *testing.T) {
		result := common.RunCLI("cluster", "create", clusterName,
			"--type", "k3d",
			"--nodes", "1",
			"--skip-wizard")
		
		require.True(t, result.Success(), 
			"Failed to create cluster. stdout: %s, stderr: %s, error: %v", 
			result.Stdout, result.Stderr, result.Error)
		assert.Contains(t, result.Stdout, "created successfully")
	})

	t.Run("verify cluster exists", func(t *testing.T) {
		// Use k3d directly to verify cluster exists
		exists, err := common.ClusterExists(clusterName)
		require.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("delete cluster", func(t *testing.T) {
		result := common.RunCLI("cluster", "delete", clusterName, "--force")
		require.True(t, result.Success(),
			"Failed to delete cluster. stdout: %s, stderr: %s, error: %v", 
			result.Stdout, result.Stderr, result.Error)
		assert.Contains(t, result.Stdout, "deleted successfully")
	})
}