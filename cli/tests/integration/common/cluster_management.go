package common

import (
	"fmt"
	"os/exec"
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
	cmd := exec.Command("k3d", "cluster", "list", name)
	err := cmd.Run()
	return err == nil, nil
}

// StopTestCluster stops a test cluster
func StopTestCluster(name string) error {
	cmd := exec.Command("k3d", "cluster", "stop", name)
	return cmd.Run()
}

// CleanupTestCluster ensures a test cluster is cleaned up
func CleanupTestCluster(name string) {
	// Best effort cleanup - ignore errors
	DeleteTestCluster(name)
}