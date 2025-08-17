package common

import (
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// GenerateTestClusterName creates a unique cluster name for testing
func GenerateTestClusterName() string {
	return fmt.Sprintf("integration-test-%d", time.Now().Unix())
}

// CreateTestCluster creates a k3d cluster for testing
func CreateTestCluster(name string) error {
	cmd := exec.Command("k3d", "cluster", "create", name, "--agents", "1", "--wait")
	return cmd.Run()
}

// DeleteTestCluster removes a test cluster
func DeleteTestCluster(name string) error {
	cmd := exec.Command("k3d", "cluster", "delete", name)
	return cmd.Run()
}

// ClusterExists checks if a cluster exists
func ClusterExists(name string) (bool, error) {
	// Use the CLI to check if cluster exists
	result := RunCLI("cluster", "status", name)
	// If status command succeeds, cluster exists
	return result.Success(), nil
}

// StopTestCluster stops a test cluster
func StopTestCluster(name string) error {
	cmd := exec.Command("k3d", "cluster", "stop", name)
	return cmd.Run()
}

// CleanupTestCluster ensures a test cluster is cleaned up
func CleanupTestCluster(name string) {
	// Use the CLI to delete cluster - more reliable
	RunCLI("cluster", "delete", name, "--force")
	// Also try k3d directly as backup
	DeleteTestCluster(name)
}

// CleanupAllTestClusters removes all test clusters to prevent resource conflicts
func CleanupAllTestClusters() {
	// Get list of clusters using k3d directly
	cmd := exec.Command("k3d", "cluster", "list", "--no-headers")
	output, err := cmd.Output()
	if err != nil {
		return
	}
	
	// Parse cluster names and delete test clusters
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) == 0 {
			continue
		}
		clusterName := fields[0] // First field is cluster name
		if clusterName != "" && (strings.Contains(clusterName, "test") || 
			strings.Contains(clusterName, "cleanup") ||
			strings.Contains(clusterName, "integration") ||
			strings.Contains(clusterName, "list-") ||
			strings.Contains(clusterName, "status-") ||
			strings.Contains(clusterName, "create-") ||
			strings.Contains(clusterName, "delete-") ||
			strings.Contains(clusterName, "multi-") ||
			strings.Contains(clusterName, "debug")) {
			CleanupTestCluster(clusterName)
		}
	}
}