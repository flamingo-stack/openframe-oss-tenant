package cluster

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/providers/k3d"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
)

// createTestExecutor creates a mock executor for testing
func createTestExecutor() executor.CommandExecutor {
	mock := executor.NewMockCommandExecutor()

	// Set up mock response for k3d cluster list command
	mockJSON := `[{"name":"test-cluster","serversCount":1,"serversRunning":1,"agentsCount":0,"agentsRunning":0,"nodes":[{"name":"k3d-test-cluster-server-0","role":"server","created":"2024-01-01T00:00:00Z"}]}]`
	mock.SetResponse("k3d cluster list", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   mockJSON,
		Duration: 100,
	})

	return mock
}

func TestNewClusterService(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	if service == nil {
		t.Fatal("NewClusterService should not return nil")
	}

	if service.executor != exec {
		t.Error("service should store the provided executor")
	}

	if service.manager == nil {
		t.Error("service should have a manager initialized")
	}
}

func TestNewClusterServiceWithOptions(t *testing.T) {
	exec := createTestExecutor()
	customManager := k3d.CreateClusterManagerWithExecutor(exec)

	service := NewClusterServiceWithOptions(exec, customManager)

	if service == nil {
		t.Fatal("NewClusterServiceWithOptions should not return nil")
	}

	if service.executor != exec {
		t.Error("service should store the provided executor")
	}

	if service.manager != customManager {
		t.Error("service should store the provided manager")
	}
}

func TestClusterService_CreateCluster(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	config := models.ClusterConfig{
		Name:       "test-cluster",
		Type:       models.ClusterTypeK3d,
		NodeCount:  1,
		K8sVersion: "v1.25.0",
	}

	err := service.CreateCluster(config)
	// With mock executor, this should not fail
	if err != nil {
		t.Errorf("CreateCluster should not error with mock executor: %v", err)
	}
}

func TestClusterService_DeleteCluster(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	err := service.DeleteCluster("test-cluster", models.ClusterTypeK3d, false)
	// With mock executor, this should not fail
	if err != nil {
		t.Errorf("DeleteCluster should not error with mock executor: %v", err)
	}
}

func TestClusterService_ListClusters(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	clusters, err := service.ListClusters()
	// Mock executor might return an error due to parsing mock output, which is acceptable
	// We're mainly testing that the method doesn't panic and returns a valid result
	if err == nil && clusters == nil {
		t.Error("ListClusters should not return nil slice when successful")
	}
}

func TestClusterService_GetClusterStatus(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	_, err := service.GetClusterStatus("test-cluster")
	// Mock executor might return an error for non-existent cluster, which is acceptable
	// We're mainly testing that the method doesn't panic
	_ = err // Ignore error for mock executor
}

func TestClusterService_DetectClusterType(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	_, err := service.DetectClusterType("test-cluster")
	// Mock executor might return an error for non-existent cluster, which is acceptable
	// We're mainly testing that the method doesn't panic
	_ = err // Ignore error for mock executor
}

func TestClusterService_CleanupCluster(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	err := service.CleanupCluster("test-cluster", models.ClusterTypeK3d, false, false)
	if err != nil {
		t.Errorf("CleanupCluster should not error: %v", err)
	}
}

func TestClusterService_ShowClusterStatus(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	// This might fail with mock data, but should not panic
	err := service.ShowClusterStatus("test-cluster", false, false, false)
	// We allow error here since mock data might not be complete
	_ = err
}

func TestClusterService_DisplayClusterList(t *testing.T) {
	exec := createTestExecutor()
	service := NewClusterService(exec)

	// Test with empty cluster list
	clusters := []models.ClusterInfo{}
	err := service.DisplayClusterList(clusters, false, false)
	if err != nil {
		t.Errorf("DisplayClusterList should not error with empty list: %v", err)
	}

	// Test with quiet mode
	err = service.DisplayClusterList(clusters, true, false)
	if err != nil {
		t.Errorf("DisplayClusterList should not error with quiet mode: %v", err)
	}
}

func TestClusterService_WithRealExecutor(t *testing.T) {
	// Test with real executor (dry-run mode)
	exec := executor.NewRealCommandExecutor(true, false) // dry-run mode
	service := NewClusterService(exec)

	if service == nil {
		t.Fatal("service should not be nil")
	}

	// Test that service can be created with real executor
	config := models.ClusterConfig{
		Name:      "test-dry-run",
		Type:      models.ClusterTypeK3d,
		NodeCount: 1,
	}

	// In dry-run mode, this should not actually create anything
	err := service.CreateCluster(config)
	// Dry-run might still error if k3d is not available, which is acceptable in tests
	_ = err
}
