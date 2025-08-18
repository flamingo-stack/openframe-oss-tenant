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
	// Use k3d directly to check if cluster exists - more reliable and faster than CLI
	cmd := exec.Command("k3d", "cluster", "list", name, "--no-headers")
	err := cmd.Run()
	// If k3d command succeeds, cluster exists
	return err == nil, nil
}

// StopTestCluster stops a test cluster
func StopTestCluster(name string) error {
	cmd := exec.Command("k3d", "cluster", "stop", name)
	return cmd.Run()
}

// CleanupTestCluster ensures a test cluster is cleaned up
func CleanupTestCluster(name string) {
	// Check if cluster exists first to avoid hanging on interactive UI
	exists, _ := ClusterExists(name)
	if exists {
		// Use the CLI to delete cluster with force flag
		RunCLI("cluster", "delete", name, "--force")
	}
	// Also try k3d directly as backup (in case cluster exists but CLI fails)
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
			strings.Contains(clusterName, "collision") ||
			strings.Contains(clusterName, "list-") ||
			strings.Contains(clusterName, "status-") ||
			strings.Contains(clusterName, "create-") ||
			strings.Contains(clusterName, "delete-") ||
			strings.Contains(clusterName, "multi-") ||
			strings.Contains(clusterName, "debug")) {
			CleanupTestCluster(clusterName)
		}
	}
	
	// Also clean up any leftover Docker networks and containers
	cleanupDockerResources()
}

// cleanupDockerResources removes leftover k3d Docker networks and containers
func cleanupDockerResources() {
	// Clean up leftover k3d networks
	cmd := exec.Command("docker", "network", "ls", "--filter", "name=k3d-", "--format", "{{.Name}}")
	if output, err := cmd.Output(); err == nil {
		networks := strings.Split(strings.TrimSpace(string(output)), "\n")
		for _, network := range networks {
			if network != "" && (strings.Contains(network, "test") || 
				strings.Contains(network, "collision") ||
				strings.Contains(network, "integration")) {
				exec.Command("docker", "network", "rm", network).Run()
			}
		}
	}
	
	// Clean up leftover k3d containers
	cmd = exec.Command("docker", "ps", "-a", "--filter", "name=k3d-", "--format", "{{.Names}}")
	if output, err := cmd.Output(); err == nil {
		containers := strings.Split(strings.TrimSpace(string(output)), "\n")
		for _, container := range containers {
			if container != "" && (strings.Contains(container, "test") || 
				strings.Contains(container, "collision") ||
				strings.Contains(container, "integration")) {
				exec.Command("docker", "rm", "-f", container).Run()
			}
		}
	}
}