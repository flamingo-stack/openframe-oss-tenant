package common

import (
	"context"
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
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "create", name, "--agents", "1", "--wait")
	return cmd.Run()
}

// DeleteTestCluster removes a test cluster
func DeleteTestCluster(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "delete", name)
	return cmd.Run()
}

// ClusterExists checks if a cluster exists
func ClusterExists(name string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "list", name)
	err := cmd.Run()
	if err != nil {
		// If the command fails, cluster likely doesn't exist
		return false, nil
	}
	return true, nil
}

// WaitForClusterReady waits for a cluster to be ready
func WaitForClusterReady(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	
	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("timeout waiting for cluster %s to be ready", name)
		default:
			// Check if cluster is ready using kubectl
			kubeCtx := fmt.Sprintf("k3d-%s", name)
			cmd := exec.Command("kubectl", "--context", kubeCtx, "get", "nodes", "--no-headers")
			if err := cmd.Run(); err == nil {
				return nil
			}
			time.Sleep(5 * time.Second)
		}
	}
}

// StopTestCluster stops a test cluster
func StopTestCluster(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "k3d", "cluster", "stop", name)
	return cmd.Run()
}

// CleanupTestCluster ensures a test cluster is cleaned up
func CleanupTestCluster(name string) {
	// Best effort cleanup - ignore errors
	DeleteTestCluster(name)
}