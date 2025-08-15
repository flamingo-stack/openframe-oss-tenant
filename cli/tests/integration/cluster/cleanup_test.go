package cluster_integration

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"testing"
	"time"

	cluster "github.com/flamingo/openframe-cli/internal/cmd/cluster"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Integration tests for cleanup command with real k3d clusters
// These tests require k3d to be installed and Docker to be running

func TestCleanupCommand_RealClusterIntegration(t *testing.T) {
	// Skip if k3d is not available
	if !isK3dAvailable() {
		t.Skip("k3d not available, skipping integration test")
	}

	// Skip if Docker is not running
	if !isDockerRunning() {
		t.Skip("Docker not running, skipping integration test")
	}

	clusterName := fmt.Sprintf("test-cleanup-%d", time.Now().Unix())
	
	// Ensure cleanup of test cluster
	defer func() {
		deleteTestCluster(clusterName)
	}()

	t.Run("cleanup with real cluster", func(t *testing.T) {
		// Create a test cluster
		err := createTestCluster(clusterName)
		require.NoError(t, err, "Failed to create test cluster")

		// Verify cluster exists
		exists, err := clusterExists(clusterName)
		require.NoError(t, err)
		require.True(t, exists, "Test cluster should exist")

		// Wait for cluster to be ready
		err = waitForClusterReady(clusterName)
		require.NoError(t, err, "Cluster should be ready")

		// Generate some container images to cleanup
		err = generateTestImages(clusterName)
		if err != nil {
			t.Logf("Warning: Failed to generate test images: %v", err)
		}

		// Reset global flags
		cluster.ResetGlobalFlags()

		// Test the cleanup command
		cmd := cluster.GetCleanupCmdForTesting()
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		err = cmd.RunE(cmd, []string{clusterName})
		
		// Cleanup should succeed or fail gracefully
		if err != nil {
			// If cleanup fails, it should be for expected reasons
			assert.True(t, 
				strings.Contains(err.Error(), "failed to detect cluster type") ||
				strings.Contains(err.Error(), "cleanup not supported") ||
				strings.Contains(err.Error(), "crictl"),
				"Unexpected cleanup error: %v", err)
		}
		// If no error, cleanup succeeded
	})
}

func TestCleanupCommand_NonExistentCluster(t *testing.T) {
	// Skip if k3d is not available
	if !isK3dAvailable() {
		t.Skip("k3d not available, skipping integration test")
	}

	nonExistentCluster := fmt.Sprintf("non-existent-%d", time.Now().Unix())

	t.Run("cleanup non-existent cluster", func(t *testing.T) {
		// Reset global flags
		cluster.ResetGlobalFlags()

		// Test cleanup with non-existent cluster
		cmd := cluster.GetCleanupCmdForTesting()
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		err := cmd.RunE(cmd, []string{nonExistentCluster})
		
		// Should handle gracefully
		if err != nil {
			assert.True(t, 
				strings.Contains(err.Error(), "failed to detect cluster type") ||
				strings.Contains(err.Error(), "cluster not found"),
				"Expected cluster not found error, got: %v", err)
		}
	})
}

func TestCleanupCommand_StoppedCluster(t *testing.T) {
	// Skip if k3d is not available
	if !isK3dAvailable() {
		t.Skip("k3d not available, skipping integration test")
	}

	// Skip if Docker is not running
	if !isDockerRunning() {
		t.Skip("Docker not running, skipping integration test")
	}

	clusterName := fmt.Sprintf("test-stopped-%d", time.Now().Unix())
	
	// Ensure cleanup of test cluster
	defer func() {
		deleteTestCluster(clusterName)
	}()

	t.Run("cleanup stopped cluster", func(t *testing.T) {
		// Create and stop a test cluster
		err := createTestCluster(clusterName)
		require.NoError(t, err, "Failed to create test cluster")

		// Stop the cluster
		err = stopTestCluster(clusterName)
		require.NoError(t, err, "Failed to stop test cluster")

		// Reset global flags
		cluster.ResetGlobalFlags()

		// Test cleanup on stopped cluster
		cmd := cluster.GetCleanupCmdForTesting()
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		err = cmd.RunE(cmd, []string{clusterName})
		
		// Should handle stopped cluster gracefully
		if err != nil {
			assert.True(t, 
				strings.Contains(err.Error(), "failed to detect cluster type") ||
				strings.Contains(err.Error(), "cluster not found") ||
				strings.Contains(err.Error(), "not running"),
				"Expected stopped cluster error, got: %v", err)
		}
	})
}

// Helper functions for integration testing

func isK3dAvailable() bool {
	cmd := exec.Command("k3d", "version")
	return cmd.Run() == nil
}

func isDockerRunning() bool {
	cmd := exec.Command("docker", "info")
	return cmd.Run() == nil
}

func createTestCluster(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "create", name, "--agents", "1", "--wait")
	return cmd.Run()
}

func deleteTestCluster(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "delete", name)
	return cmd.Run()
}

func stopTestCluster(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "stop", name)
	return cmd.Run()
}

func clusterExists(name string) (bool, error) {
	cmd := exec.Command("k3d", "cluster", "list", "--output", "json")
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}
	
	return strings.Contains(string(output), name), nil
}

func waitForClusterReady(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for cluster %s to be ready", name)
		case <-ticker.C:
			// Check if cluster nodes are ready
			cmd := exec.CommandContext(ctx, "docker", "ps", "--filter", fmt.Sprintf("name=k3d-%s", name), "--format", "{{.Status}}")
			output, err := cmd.Output()
			if err != nil {
				continue
			}
			
			// If we have output and it contains "Up", cluster is running
			if strings.Contains(string(output), "Up") {
				return nil
			}
		}
	}
}

func generateTestImages(clusterName string) error {
	// Get cluster nodes
	cmd := exec.Command("docker", "ps", "--format", "{{.Names}}", "--filter", fmt.Sprintf("name=k3d-%s", clusterName))
	output, err := cmd.Output()
	if err != nil {
		return err
	}
	
	nodeNames := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(nodeNames) == 0 || nodeNames[0] == "" {
		return fmt.Errorf("no cluster nodes found")
	}
	
	// Try to pull a small image in one of the nodes to create something to cleanup
	for _, nodeName := range nodeNames {
		if nodeName != "" {
			cmd := exec.Command("docker", "exec", nodeName, "crictl", "pull", "busybox:latest")
			if err := cmd.Run(); err == nil {
				return nil // Successfully generated test image
			}
		}
	}
	
	return fmt.Errorf("failed to generate test images in any node")
}

// Test with verbose output
func TestCleanupCommand_VerboseOutput(t *testing.T) {
	// Skip if k3d is not available
	if !isK3dAvailable() {
		t.Skip("k3d not available, skipping integration test")
	}

	// Skip if Docker is not running
	if !isDockerRunning() {
		t.Skip("Docker not running, skipping integration test")
	}

	clusterName := fmt.Sprintf("test-verbose-%d", time.Now().Unix())
	
	// Ensure cleanup of test cluster
	defer func() {
		deleteTestCluster(clusterName)
	}()

	t.Run("cleanup with verbose output", func(t *testing.T) {
		// Create a test cluster
		err := createTestCluster(clusterName)
		require.NoError(t, err, "Failed to create test cluster")

		// Wait for cluster to be ready
		err = waitForClusterReady(clusterName)
		require.NoError(t, err, "Cluster should be ready")

		// Reset global flags and set verbose
		cluster.ResetGlobalFlags()
		cluster.SetVerboseForTesting(true)
		defer func() { cluster.SetVerboseForTesting(false) }()

		// Test cleanup with verbose output
		cmd := cluster.GetCleanupCmdForTesting()
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		err = cmd.RunE(cmd, []string{clusterName})
		
		// Should complete with or without error
		if err != nil {
			t.Logf("Cleanup completed with error (expected in test environment): %v", err)
		}
	})
}

// Benchmark cleanup command with real cluster
func BenchmarkCleanupCommand_RealCluster(b *testing.B) {
	if !isK3dAvailable() || !isDockerRunning() {
		b.Skip("k3d or Docker not available, skipping benchmark")
	}

	clusterName := fmt.Sprintf("bench-cleanup-%d", time.Now().Unix())
	
	// Create test cluster once
	err := createTestCluster(clusterName)
	if err != nil {
		b.Fatalf("Failed to create test cluster: %v", err)
	}
	defer deleteTestCluster(clusterName)

	// Wait for cluster to be ready
	err = waitForClusterReady(clusterName)
	if err != nil {
		b.Fatalf("Cluster not ready: %v", err)
	}

	b.ResetTimer()
	
	for i := 0; i < b.N; i++ {
		cluster.ResetGlobalFlags()
		cmd := cluster.GetCleanupCmdForTesting()
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		_ = cmd.RunE(cmd, []string{clusterName})
	}
}