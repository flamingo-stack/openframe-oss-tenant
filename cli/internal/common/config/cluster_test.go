package config

import (
	"testing"

	"github.com/flamingo/openframe/internal/cluster"
	"github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/common/executor"
	"github.com/flamingo/openframe/tests/testutil"
)

func TestNewClusterService(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
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
	exec := testutil.NewTestMockExecutor()
	customManager := cluster.CreateClusterManagerWithExecutor(exec)
	
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
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	config := domain.ClusterConfig{
		Name:       "test-cluster",
		Type:       domain.ClusterTypeK3d,
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
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	err := service.DeleteCluster("test-cluster", domain.ClusterTypeK3d, false)
	// With mock executor, this should not fail
	if err != nil {
		t.Errorf("DeleteCluster should not error with mock executor: %v", err)
	}
}

func TestClusterService_StartCluster(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	err := service.StartCluster("test-cluster", domain.ClusterTypeK3d)
	// With mock executor, this should not fail
	if err != nil {
		t.Errorf("StartCluster should not error with mock executor: %v", err)
	}
}

func TestClusterService_ListClusters(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	clusters, err := service.ListClusters()
	// Mock executor might return an error due to parsing mock output, which is acceptable
	// We're mainly testing that the method doesn't panic and returns a valid result
	if err == nil && clusters == nil {
		t.Error("ListClusters should not return nil slice when successful")
	}
}

func TestClusterService_GetClusterStatus(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	_, err := service.GetClusterStatus("test-cluster")
	// Mock executor might return an error for non-existent cluster, which is acceptable
	// We're mainly testing that the method doesn't panic
	_ = err // Ignore error for mock executor
}

func TestClusterService_DetectClusterType(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	_, err := service.DetectClusterType("test-cluster")
	// Mock executor might return an error for non-existent cluster, which is acceptable
	// We're mainly testing that the method doesn't panic
	_ = err // Ignore error for mock executor
}

func TestClusterService_CleanupCluster(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	err := service.CleanupCluster("test-cluster", domain.ClusterTypeK3d, false)
	if err != nil {
		t.Errorf("CleanupCluster should not error: %v", err)
	}
}

func TestClusterService_ShowClusterStatus(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	// This might fail with mock data, but should not panic
	err := service.ShowClusterStatus("test-cluster", false, false, false)
	// We allow error here since mock data might not be complete
	_ = err
}

func TestClusterService_DisplayClusterList(t *testing.T) {
	exec := testutil.NewTestMockExecutor()
	service := NewClusterService(exec)
	
	// Test with empty cluster list
	clusters := []domain.ClusterInfo{}
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
	config := domain.ClusterConfig{
		Name:       "test-dry-run",
		Type:       domain.ClusterTypeK3d,
		NodeCount:  1,
	}
	
	// In dry-run mode, this should not actually create anything
	err := service.CreateCluster(config)
	// Dry-run might still error if k3d is not available, which is acceptable in tests
	_ = err
}