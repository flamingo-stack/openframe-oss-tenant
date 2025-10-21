package cluster_integration

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/flamingo-stack/openframe/openframe/tests/integration/common"
	"github.com/stretchr/testify/require"
)

// TestValidation tests all command validation without creating clusters (< 5 seconds)
func TestValidation(t *testing.T) {
	startTime := time.Now()
	defer func() {
		t.Logf("TestValidation completed in %v", time.Since(startTime))
	}()

	validationTests := []struct {
		name        string
		args        []string
		expectError bool
		errorMsg    string
	}{
		// Create command validation
		{"create_help", []string{"cluster", "create", "--help"}, false, ""},
		{"create_dry_run", []string{"cluster", "create", "test", "--dry-run", "--skip-wizard"}, false, ""},
		{"create_empty_name", []string{"cluster", "create", "", "--skip-wizard", "--dry-run"}, true, "empty"},
		{"create_zero_nodes", []string{"cluster", "create", "test", "--nodes", "0", "--skip-wizard", "--dry-run"}, true, "node count"},

		// Other commands validation
		{"delete_help", []string{"cluster", "delete", "--help"}, false, ""},
		{"delete_nonexistent", []string{"cluster", "delete", "nonexistent-cluster"}, true, ""},
		{"status_help", []string{"cluster", "status", "--help"}, false, ""},
		{"status_nonexistent", []string{"cluster", "status", "nonexistent-cluster"}, true, ""},
		{"list_basic", []string{"cluster", "list"}, false, ""},
		{"list_help", []string{"cluster", "list", "--help"}, false, ""},
		{"list_quiet", []string{"cluster", "list", "--quiet"}, false, ""},
		{"cleanup_help", []string{"cluster", "cleanup", "--help"}, false, ""},
		{"cleanup_nonexistent", []string{"cluster", "cleanup", "nonexistent-cluster"}, true, ""},
	}

	for _, tt := range validationTests {
		t.Run(tt.name, func(t *testing.T) {
			result := common.RunCLI(tt.args...)
			if tt.expectError {
				require.True(t, result.Failed(), "Expected command to fail: %s", strings.Join(tt.args, " "))
				if tt.errorMsg != "" {
					require.Contains(t, strings.ToLower(result.Output()), strings.ToLower(tt.errorMsg))
				}
			} else {
				require.True(t, result.Success(), "Expected command to succeed: %s\nError: %s", strings.Join(tt.args, " "), result.Stderr)
			}
		})
	}
}

// TestClusterOperations tests complete cluster lifecycle in sequence (< 3 minutes)
func TestClusterOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping cluster operations in short mode")
	}

	startTime := time.Now()
	defer func() {
		t.Logf("TestClusterOperations completed in %v", time.Since(startTime))
	}()

	// Check dependencies
	if !common.Docker.IsAvailable() {
		t.Skip("Docker required for cluster tests")
	}
	if !common.K3d.IsAvailable() {
		t.Skip("k3d required for cluster tests")
	}

	// Quick cleanup - only remove test clusters, not global cleanup
	t.Log("Cleaning up any existing test clusters")
	common.CleanupAllTestClusters()

	// Generate unique cluster name with shorter timestamp to avoid conflicts
	clusterName := fmt.Sprintf("test-%d", time.Now().Unix()%100000)

	// Ensure cleanup on exit
	t.Cleanup(func() {
		common.CleanupTestCluster(clusterName)
	})

	// Phase 1: Create cluster with retry logic and better error handling
	t.Log("Phase 1: Creating cluster")
	var createSuccess bool
	var lastError string

	for attempt := 1; attempt <= 3; attempt++ {
		t.Logf("Cluster creation attempt %d for: %s", attempt, clusterName)

		// Clean up any partial state from previous attempt
		if attempt > 1 {
			common.CleanupTestCluster(clusterName)
			time.Sleep(500 * time.Millisecond) // Fixed short backoff
		}

		result := common.RunCLI("cluster", "create", clusterName, "--skip-wizard", "--nodes", "1")
		if result.Success() {
			createSuccess = true
			t.Logf("✓ Cluster creation succeeded on attempt %d", attempt)
			break
		}

		lastError = result.Stderr
		t.Logf("Cluster creation attempt %d failed: %s", attempt, result.Stderr)

		// Check if it's a port conflict and try a different name
		if strings.Contains(strings.ToLower(result.Stderr), "port") || strings.Contains(strings.ToLower(result.Stderr), "bind") {
			clusterName = fmt.Sprintf("test-%d-%d", time.Now().Unix()%100000, attempt)
			t.Logf("Port conflict detected, trying new name: %s", clusterName)
		}
	}
	require.True(t, createSuccess, "Failed to create cluster after 3 attempts. Last error: %s", lastError)

	// Verify cluster exists
	exists, err := common.ClusterExists(clusterName)
	require.NoError(t, err)
	require.True(t, exists, "Cluster should exist after creation")
	t.Log("✓ Cluster created successfully")

	// Phase 2: Test status commands
	t.Log("Phase 2: Testing status commands")
	statusResult := common.RunCLI("cluster", "status", clusterName)
	require.True(t, statusResult.Success(), "Status command failed: %s", statusResult.Stderr)
	require.Contains(t, statusResult.Stdout, clusterName)
	require.Contains(t, statusResult.Stdout, "Ready (1/1)")

	// Test verbose status
	statusVerboseResult := common.RunCLI("cluster", "status", clusterName, "--verbose")
	if statusVerboseResult.Success() {
		require.Contains(t, statusVerboseResult.Stdout, clusterName)
	}
	t.Log("✓ Status commands working")

	// Phase 3: Test list commands
	t.Log("Phase 3: Testing list commands")
	listResult := common.RunCLI("cluster", "list")
	require.True(t, listResult.Success(), "List command failed: %s", listResult.Stderr)
	require.Contains(t, listResult.Stdout, clusterName)

	// Test list with flags
	listQuietResult := common.RunCLI("cluster", "list", "--quiet")
	require.True(t, listQuietResult.Success(), "List quiet failed: %s", listQuietResult.Stderr)
	require.Contains(t, listQuietResult.Stdout, clusterName)

	listVerboseResult := common.RunCLI("cluster", "list", "--verbose")
	if listVerboseResult.Success() {
		require.Contains(t, listVerboseResult.Stdout, clusterName)
	}
	t.Log("✓ List commands working")

	// Phase 4: Test cleanup command
	t.Log("Phase 4: Testing cleanup command")
	clusterCleanupResult := common.RunCLI("cluster", "cleanup", clusterName, "--force")
	require.True(t, clusterCleanupResult.Success(), "Cleanup command failed: %s", clusterCleanupResult.Stderr)

	// Verify cluster still exists after cleanup
	exists, err = common.ClusterExists(clusterName)
	require.NoError(t, err)
	require.True(t, exists, "Cluster should still exist after cleanup")

	// Verify cluster is still functional
	statusAfterCleanup := common.RunCLI("cluster", "status", clusterName)
	require.True(t, statusAfterCleanup.Success(), "Status after cleanup failed: %s", statusAfterCleanup.Stderr)
	t.Log("✓ Cleanup command working")

	// Phase 5: Test idempotent operations
	t.Log("Phase 5: Testing idempotent operations")
	// Multiple status calls should work
	for i := 0; i < 3; i++ {
		statusResult := common.RunCLI("cluster", "status", clusterName)
		require.True(t, statusResult.Success(), "Status call %d failed", i+1)
	}

	// Multiple cleanup calls (may fail on subsequent runs)
	for i := 0; i < 2; i++ {
		multiCleanupResult := common.RunCLI("cluster", "cleanup", clusterName, "--force")
		if multiCleanupResult.Failed() {
			t.Logf("Cleanup %d failed as expected (no resources to clean)", i+1)
		}
	}
	t.Log("✓ Idempotent operations working")

	// Phase 6: Delete cluster
	t.Log("Phase 6: Deleting cluster")
	deleteResult := common.RunCLI("cluster", "delete", clusterName, "--force")
	require.True(t, deleteResult.Success(), "Delete command failed: %s", deleteResult.Stderr)

	// k3d deletion is usually immediate - minimal wait

	// Verify cluster is gone
	exists, err = common.ClusterExists(clusterName)
	require.NoError(t, err)
	require.False(t, exists, "Cluster should not exist after deletion")
	t.Log("✓ Cluster deleted successfully")

	// Phase 7: Test operations on deleted cluster
	t.Log("Phase 7: Testing operations on deleted cluster")

	// Status should fail
	statusDeletedResult := common.RunCLI("cluster", "status", clusterName)
	require.True(t, statusDeletedResult.Failed(), "Status on deleted cluster should fail")

	// Delete should fail
	deleteDeletedResult := common.RunCLI("cluster", "delete", clusterName, "--force")
	require.True(t, deleteDeletedResult.Failed(), "Delete on deleted cluster should fail")

	t.Log("✓ Error handling for deleted cluster working")
	t.Log("All phases completed successfully!")
}

// TestDryRunOperations tests dry-run functionality (< 30 seconds)
func TestDryRunOperations(t *testing.T) {
	startTime := time.Now()
	defer func() {
		t.Logf("TestDryRunOperations completed in %v", time.Since(startTime))
	}()

	dryRunTests := []struct {
		name string
		args []string
	}{
		{"basic_dry_run", []string{"cluster", "create", "dry-test-basic", "--dry-run", "--skip-wizard"}},
		{"dry_run_with_nodes", []string{"cluster", "create", "dry-test-nodes", "--dry-run", "--skip-wizard", "--nodes", "2"}},
		{"dry_run_with_type", []string{"cluster", "create", "dry-test-type", "--dry-run", "--skip-wizard", "--type", "k3d"}},
		{"dry_run_with_version", []string{"cluster", "create", "dry-test-version", "--dry-run", "--skip-wizard", "--version", "v1.31.5-k3s1"}},
	}

	for _, tt := range dryRunTests {
		t.Run(tt.name, func(t *testing.T) {
			result := common.RunCLI(tt.args...)
			require.True(t, result.Success(), "Dry run failed: %s\nError: %s", strings.Join(tt.args, " "), result.Stderr)

			// Verify no actual cluster was created
			clusterName := tt.args[2] // cluster name is 3rd argument
			exists, err := common.ClusterExists(clusterName)
			require.NoError(t, err)
			require.False(t, exists, "Dry run should not create actual cluster")
		})
	}
}

// TestEmptyList tests list command with no clusters
func TestEmptyList(t *testing.T) {
	// Clean up any existing clusters
	common.CleanupAllTestClusters()

	result := common.RunCLI("cluster", "list")
	require.True(t, result.Success(), "List command failed: %s", result.Stderr)

	// Output should indicate no clusters or be empty/header only
	output := strings.TrimSpace(result.Stdout)
	if output != "" && !strings.Contains(output, "NAME") {
		// Check for the presence of "no" and "clusters" and "available" to handle ANSI formatting
		outputLower := strings.ToLower(output)
		require.True(t,
			strings.Contains(outputLower, "no") &&
				strings.Contains(outputLower, "clusters") &&
				strings.Contains(outputLower, "available"),
			"Expected message about no clusters being available, got: %s", output)
	}
}

// TestEdgeCases tests critical edge cases and safety scenarios (< 15 seconds)
func TestEdgeCases(t *testing.T) {
	startTime := time.Now()
	defer func() {
		t.Logf("TestEdgeCases completed in %v", time.Since(startTime))
	}()

	t.Run("ClusterNameValidation", func(t *testing.T) {
		nameTests := []struct {
			name        string
			clusterName string
			expectation string // "fail", "succeed", or "either"
		}{
			{"empty_name", "", "fail"},
			{"just_spaces", "   ", "either"},                 // CLI may trim spaces
			{"special_chars", "test@cluster!", "either"},     // k3d may accept some special chars
			{"too_long", strings.Repeat("a", 100), "either"}, // May truncate or fail
			{"dots_only", "...", "either"},                   // Depends on implementation
			{"starts_with_dash", "-test", "either"},          // k3d may allow this
			{"uppercase", "TEST", "succeed"},                 // Usually allowed
			{"with_numbers", "test123", "succeed"},
			{"with_dashes", "test-cluster", "succeed"},
			{"very_short", "a", "succeed"},
		}

		for _, tc := range nameTests {
			t.Run(tc.name, func(t *testing.T) {
				result := common.RunCLI("cluster", "create", tc.clusterName, "--dry-run", "--skip-wizard")

				switch tc.expectation {
				case "fail":
					require.True(t, result.Failed(), "Expected '%s' to fail but it succeeded", tc.clusterName)
				case "succeed":
					require.True(t, result.Success(), "Expected '%s' to succeed but it failed: %s", tc.clusterName, result.Stderr)
				case "either":
					// Just log the behavior for documentation
					if result.Failed() {
						t.Logf("Name '%s' was rejected: %s", tc.clusterName, result.ErrorMessage())
					} else {
						t.Logf("Name '%s' was accepted", tc.clusterName)
					}
				}
			})
		}
	})

	t.Run("ConcurrentOperations", func(t *testing.T) {
		if testing.Short() {
			t.Skip("Skipping concurrent operations in short mode")
		}

		// Test concurrent list operations (safe operations)
		numConcurrent := 3
		results := make(chan bool, numConcurrent)

		for i := 0; i < numConcurrent; i++ {
			go func(id int) {
				result := common.RunCLI("cluster", "list")
				results <- result.Success()
			}(i)
		}

		// All should succeed
		for i := 0; i < numConcurrent; i++ {
			require.True(t, <-results, "Concurrent list operation %d failed", i)
		}
	})

	t.Run("ResourceConstraints", func(t *testing.T) {
		// Test with excessive node count (should be validated or fail gracefully)
		result := common.RunCLI("cluster", "create", "huge-cluster", "--nodes", "1000", "--dry-run", "--skip-wizard")
		// Should either succeed (dry-run) or fail gracefully with clear error
		if result.Failed() {
			require.Contains(t, strings.ToLower(result.Output()), "node", "Error should mention node limits")
		}

		// Test with negative numbers
		result = common.RunCLI("cluster", "create", "negative-cluster", "--nodes", "-5", "--dry-run", "--skip-wizard")
		require.True(t, result.Failed(), "Negative node count should fail")
		require.Contains(t, strings.ToLower(result.Output()), "node", "Error should mention node validation")
	})

	t.Run("StateConsistency", func(t *testing.T) {
		// Test duplicate creation attempts
		testName := fmt.Sprintf("duplicate-test-%d", time.Now().Unix()%10000)

		// First dry-run should succeed
		result1 := common.RunCLI("cluster", "create", testName, "--dry-run", "--skip-wizard")
		require.True(t, result1.Success(), "First dry-run should succeed")

		// Second dry-run should also succeed (idempotent)
		result2 := common.RunCLI("cluster", "create", testName, "--dry-run", "--skip-wizard")
		require.True(t, result2.Success(), "Second dry-run should succeed")

		// Operations on dry-run clusters should fail appropriately
		statusResult := common.RunCLI("cluster", "status", testName)
		require.True(t, statusResult.Failed(), "Status on dry-run cluster should fail")
	})

	t.Run("CommandChaining", func(t *testing.T) {
		// Test rapid command execution without waiting
		commands := [][]string{
			{"cluster", "list"},
			{"cluster", "list", "--quiet"},
			{"cluster", "list", "--help"},
			{"cluster", "create", "--help"},
			{"cluster", "delete", "--help"},
		}

		for i, cmd := range commands {
			result := common.RunCLI(cmd...)
			require.True(t, result.Success(), "Command chain %d failed: %s", i, strings.Join(cmd, " "))
		}
	})
}

// TestExtendedScenarios tests comprehensive scenarios for production safety (< 60 seconds)
func TestExtendedScenarios(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping extended scenarios in short mode")
	}

	startTime := time.Now()
	defer func() {
		t.Logf("TestExtendedScenarios completed in %v", time.Since(startTime))
	}()

	// Check dependencies
	if !common.Docker.IsAvailable() {
		t.Skip("Docker required for extended tests")
	}
	if !common.K3d.IsAvailable() {
		t.Skip("k3d required for extended tests")
	}

	t.Run("MultiNodeCluster", func(t *testing.T) {
		common.CleanupAllTestClusters()
		clusterName := fmt.Sprintf("multi-test-%d", time.Now().Unix()%10000)

		t.Cleanup(func() {
			common.CleanupTestCluster(clusterName)
		})

		// Create 2-node cluster
		t.Log("Creating 2-node cluster")
		result := common.RunCLI("cluster", "create", clusterName, "--skip-wizard", "--nodes", "2")
		require.True(t, result.Success(), "Multi-node cluster creation failed: %s", result.Stderr)

		// Verify it shows correct node count in status
		statusResult := common.RunCLI("cluster", "status", clusterName)
		require.True(t, statusResult.Success(), "Status failed: %s", statusResult.Stderr)
		// Multi-node clusters should show server count (1 server + N agents)
		require.Contains(t, statusResult.Stdout, "Ready (1/1)", "Should show server status")

		// Clean up
		deleteResult := common.RunCLI("cluster", "delete", clusterName, "--force")
		require.True(t, deleteResult.Success(), "Multi-node delete failed: %s", deleteResult.Stderr)

		time.Sleep(1 * time.Second) // Allow cleanup
	})

	t.Run("ClusterCollisions", func(t *testing.T) {
		common.CleanupAllTestClusters()
		baseName := fmt.Sprintf("collision-%d", time.Now().Unix()%10000)

		cluster1 := baseName + "-1"
		cluster2 := baseName + "-2"

		t.Cleanup(func() {
			common.CleanupTestCluster(cluster1)
			common.CleanupTestCluster(cluster2)
		})

		// Test creating clusters with different names sequentially (avoiding simultaneous creation)
		// First cluster lifecycle
		t.Logf("Creating first cluster: %s", cluster1)
		result1 := common.RunCLI("cluster", "create", cluster1, "--skip-wizard", "--nodes", "1")
		require.True(t, result1.Success(), "First cluster creation failed: %s", result1.Stderr)

		// Verify first cluster is working
		listResult := common.RunCLI("cluster", "list")
		require.True(t, listResult.Success(), "List failed after first cluster: %s", listResult.Stderr)
		require.Contains(t, listResult.Stdout, cluster1, "First cluster missing from list")

		statusResult := common.RunCLI("cluster", "status", cluster1)
		require.True(t, statusResult.Success(), "First cluster status failed: %s", statusResult.Stderr)

		// Clean up first cluster completely before creating second
		t.Logf("Deleting first cluster before creating second: %s", cluster1)
		deleteResult1 := common.RunCLI("cluster", "delete", cluster1, "--force")
		require.True(t, deleteResult1.Success(), "Delete cluster1 failed: %s", deleteResult1.Stderr)

		// Wait for cleanup to complete and resources to be freed
		time.Sleep(1 * time.Second) // Reduced wait time

		// Second cluster lifecycle
		t.Logf("Creating second cluster: %s", cluster2)
		result2 := common.RunCLI("cluster", "create", cluster2, "--skip-wizard", "--nodes", "1")
		require.True(t, result2.Success(), "Second cluster creation failed: %s", result2.Stderr)

		// Verify second cluster is working
		listResult2 := common.RunCLI("cluster", "list")
		require.True(t, listResult2.Success(), "List failed after second cluster: %s", listResult2.Stderr)
		require.Contains(t, listResult2.Stdout, cluster2, "Second cluster missing from list")
		require.NotContains(t, listResult2.Stdout, cluster1, "First cluster should be deleted")

		statusResult2 := common.RunCLI("cluster", "status", cluster2)
		require.True(t, statusResult2.Success(), "Second cluster status failed: %s", statusResult2.Stderr)

		// Clean up second cluster
		t.Logf("Deleting second cluster: %s", cluster2)
		deleteResult2 := common.RunCLI("cluster", "delete", cluster2, "--force")
		require.True(t, deleteResult2.Success(), "Delete cluster2 failed: %s", deleteResult2.Stderr)

		time.Sleep(1 * time.Second) // Allow cleanup
	})

	t.Run("InterruptionRecovery", func(t *testing.T) {
		common.CleanupAllTestClusters()
		clusterName := fmt.Sprintf("interrupt-test-%d", time.Now().Unix()%10000)

		t.Cleanup(func() {
			common.CleanupTestCluster(clusterName)
		})

		// Create cluster
		result := common.RunCLI("cluster", "create", clusterName, "--skip-wizard", "--nodes", "1")
		require.True(t, result.Success(), "Cluster creation failed: %s", result.Stderr)

		// Simulate interruption by trying operations on partially ready cluster
		// Check status immediately (may be still starting)
		statusResult := common.RunCLI("cluster", "status", clusterName)
		if statusResult.Failed() {
			t.Logf("Status failed during startup (expected): %s", statusResult.Stderr)
		}

		// Wait a bit and try again
		time.Sleep(2 * time.Second)
		statusResult = common.RunCLI("cluster", "status", clusterName)
		require.True(t, statusResult.Success(), "Status should work after startup: %s", statusResult.Stderr)

		// Test recovery with cleanup
		cleanupResult := common.RunCLI("cluster", "cleanup", clusterName, "--force")
		require.True(t, cleanupResult.Success(), "Cleanup should work: %s", cleanupResult.Stderr)

		// Status should still work after cleanup
		statusResult = common.RunCLI("cluster", "status", clusterName)
		require.True(t, statusResult.Success(), "Status should work after cleanup: %s", statusResult.Stderr)

		// Clean up
		deleteResult := common.RunCLI("cluster", "delete", clusterName, "--force")
		require.True(t, deleteResult.Success(), "Delete failed: %s", deleteResult.Stderr)
	})

	t.Run("StressOperations", func(t *testing.T) {
		common.CleanupAllTestClusters()
		clusterName := fmt.Sprintf("stress-test-%d", time.Now().Unix()%10000)

		t.Cleanup(func() {
			common.CleanupTestCluster(clusterName)
		})

		// Create cluster
		result := common.RunCLI("cluster", "create", clusterName, "--skip-wizard", "--nodes", "1")
		require.True(t, result.Success(), "Cluster creation failed: %s", result.Stderr)

		// Rapid status checks
		for i := 0; i < 5; i++ {
			statusResult := common.RunCLI("cluster", "status", clusterName)
			require.True(t, statusResult.Success(), "Status check %d failed: %s", i, statusResult.Stderr)
		}

		// Rapid list checks
		for i := 0; i < 5; i++ {
			listResult := common.RunCLI("cluster", "list")
			require.True(t, listResult.Success(), "List check %d failed: %s", i, listResult.Stderr)
			require.Contains(t, listResult.Stdout, clusterName, "Cluster missing in list check %d", i)
		}

		// Multiple cleanup operations
		for i := 0; i < 3; i++ {
			cleanupResult := common.RunCLI("cluster", "cleanup", clusterName, "--force")
			if cleanupResult.Failed() {
				t.Logf("Cleanup %d failed (may be expected): %s", i, cleanupResult.Stderr)
			}
		}

		// Final verification
		statusResult := common.RunCLI("cluster", "status", clusterName)
		require.True(t, statusResult.Success(), "Final status failed: %s", statusResult.Stderr)

		// Clean up
		deleteResult := common.RunCLI("cluster", "delete", clusterName, "--force")
		require.True(t, deleteResult.Success(), "Delete failed: %s", deleteResult.Stderr)
	})
}
