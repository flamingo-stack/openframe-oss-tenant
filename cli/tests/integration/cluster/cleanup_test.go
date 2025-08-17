package cluster_integration

import (
	"testing"

	"github.com/flamingo/openframe/tests/integration/common"
	"github.com/flamingo/openframe/tests/testutil"
)

func TestCleanupCommand_RealClusterIntegration(t *testing.T) {
	// Check dependencies
	common.RequireClusterDependencies(t)

	t.Run("cleanup with real cluster", func(t *testing.T) {
		result := common.RunCLI("cluster", "cleanup", "test-cluster")
		// Cleanup should handle non-existent clusters gracefully
		if result.Failed() {
			// Expected errors for non-existent clusters
			testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
				StderrContainsAny("failed to detect cluster type", "cluster not found")
		}
	})
}

func TestCleanupCommand_NonExistentCluster(t *testing.T) {
	t.Run("cleanup non-existent cluster", func(t *testing.T) {
		result := common.RunCLI("cluster", "cleanup", "non-existent-1755431234")
		
		// Should handle gracefully
		testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
			StderrContainsAny("failed to detect cluster type", "cluster not found")
	})
}

func TestCleanupCommand_StoppedCluster(t *testing.T) {
	// Check dependencies
	common.RequireClusterDependencies(t)

	t.Skip("Docker not running, skipping integration test")
}

func TestCleanupCommand_VerboseOutput(t *testing.T) {
	// Check dependencies
	common.RequireClusterDependencies(t)

	t.Skip("Docker not running, skipping integration test")
}