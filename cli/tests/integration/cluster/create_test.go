package cluster_integration

import (
	"testing"

	"github.com/flamingo/openframe-cli/tests/testutil"
	"github.com/flamingo/openframe-cli/tests/integration/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClusterCreate_Help(t *testing.T) {
	result := common.RunCLI("cluster", "create", "--help")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("Create a new Kubernetes cluster").
		StdoutContains("--type").
		StdoutContains("--nodes").
		StdoutContains("--skip-wizard").
		StdoutContains("--dry-run")
}

func TestClusterCreate_DryRun(t *testing.T) {
	result := common.RunCLI("cluster", "create", "integration-test", 
		"--skip-wizard", "--dry-run", "--type", "k3d", "--nodes", "1")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("Configuration Summary:").
		StdoutContains("integration-test").
		StdoutContains("k3d").
		StdoutContains("Node Count: 1").
		StdoutContains("DRY RUN MODE")
}

func TestClusterCreate_InvalidFlags(t *testing.T) {
	result := common.RunCLI("cluster", "create", "--invalid-flag")
	
	testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
		StderrContains("unknown flag")
}

func TestClusterCreate_TooManyArgs(t *testing.T) {
	result := common.RunCLI("cluster", "create", "cluster1", "cluster2", "--skip-wizard", "--dry-run")
	
	testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
		OutputContains("accepts at most 1 arg")
}

func TestClusterCreate_EmptyName(t *testing.T) {
	result := common.RunCLI("cluster", "create", "", "--skip-wizard", "--dry-run")
	
	testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
		OutputContains("cluster name cannot be empty")
}

func TestClusterCreate_DefaultValues(t *testing.T) {
	result := common.RunCLI("cluster", "create", "--skip-wizard", "--dry-run")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("openframe-dev").  // default name
		StdoutContains("k3d").            // default type
		StdoutContains("Node Count: 3")   // default node count
}

func TestClusterCreate_AllFlags(t *testing.T) {
	result := common.RunCLI("cluster", "create", "test-all-flags",
		"--type", "k3d",
		"--nodes", "2", 
		"--version", "v1.31.0-k3s1",
		"--skip-wizard",
		"--dry-run")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("test-all-flags").
		StdoutContains("k3d").
		StdoutContains("Node Count: 2").
		StdoutContains("v1.31.0-k3s1")
}

func TestClusterCreate_ShortFlags(t *testing.T) {
	result := common.RunCLI("cluster", "create", "test-short",
		"-t", "k3d",
		"-n", "1",
		"--version", "v1.32.0-k3s1",
		"--skip-wizard",
		"--dry-run")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("test-short").
		StdoutContains("k3d").
		StdoutContains("Node Count: 1").
		StdoutContains("v1.32.0-k3s1")
}

func TestClusterCreate_GlobalVerbose(t *testing.T) {
	result := common.RunCLI("cluster", "create", "test-verbose",
		"--verbose", "--skip-wizard", "--dry-run")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("test-verbose")
}

func TestClusterCreate_GlobalSilent(t *testing.T) {
	result := common.RunCLI("cluster", "create", "test-silent",
		"--silent", "--skip-wizard", "--dry-run")
	
	// Silent mode should suppress most output except errors
	assert.NoError(t, result.Error)
	// Should have minimal or no output in silent mode
	_ = result.Stdout // Silent mode may or may not produce output
}

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