package cluster

import (
	"context"
	"errors"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster/domain"
	"github.com/flamingo/openframe-cli/internal/common/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCommandExecutor for testing
type MockCommandExecutor struct {
	mock.Mock
}

func (m *MockCommandExecutor) Execute(ctx context.Context, name string, args ...string) (*utils.CommandResult, error) {
	arguments := m.Called(ctx, name, args)
	if arguments.Get(0) == nil {
		return nil, arguments.Error(1)
	}
	return arguments.Get(0).(*utils.CommandResult), arguments.Error(1)
}

func (m *MockCommandExecutor) ExecuteWithOptions(ctx context.Context, options utils.ExecuteOptions) (*utils.CommandResult, error) {
	arguments := m.Called(ctx, options)
	if arguments.Get(0) == nil {
		return nil, arguments.Error(1)
	}
	return arguments.Get(0).(*utils.CommandResult), arguments.Error(1)
}

func TestNewFlagContainer(t *testing.T) {
	t.Run("creates container with default values", func(t *testing.T) {
		container := NewFlagContainer()
		
		assert.NotNil(t, container)
		assert.NotNil(t, container.Global)
		assert.NotNil(t, container.Create)
		assert.NotNil(t, container.List)
		assert.NotNil(t, container.Status)
		assert.NotNil(t, container.Delete)
		assert.NotNil(t, container.Start)
		assert.NotNil(t, container.Cleanup)
		
		// Check default values for Create flags
		assert.Equal(t, "k3d", container.Create.ClusterType)
		assert.Equal(t, 3, container.Create.NodeCount)
		assert.Equal(t, "v1.31.5-k3s1", container.Create.K8sVersion)
	})
}

func TestFlagContainer_SyncGlobalFlags(t *testing.T) {
	t.Run("syncs global flags to all command flags", func(t *testing.T) {
		container := NewFlagContainer()
		
		// Set some global flag values
		container.Global.Verbose = true
		container.Global.DryRun = true
		
		// Sync the global flags
		container.SyncGlobalFlags()
		
		// Verify that all command flags have the global values
		assert.Equal(t, container.Global.Verbose, container.Create.GlobalFlags.Verbose)
		assert.Equal(t, container.Global.DryRun, container.Create.GlobalFlags.DryRun)
		
		assert.Equal(t, container.Global.Verbose, container.List.GlobalFlags.Verbose)
		assert.Equal(t, container.Global.DryRun, container.List.GlobalFlags.DryRun)
		
		assert.Equal(t, container.Global.Verbose, container.Status.GlobalFlags.Verbose)
		assert.Equal(t, container.Global.DryRun, container.Status.GlobalFlags.DryRun)
		
		assert.Equal(t, container.Global.Verbose, container.Delete.GlobalFlags.Verbose)
		assert.Equal(t, container.Global.DryRun, container.Delete.GlobalFlags.DryRun)
		
		assert.Equal(t, container.Global.Verbose, container.Start.GlobalFlags.Verbose)
		assert.Equal(t, container.Global.DryRun, container.Start.GlobalFlags.DryRun)
		
		assert.Equal(t, container.Global.Verbose, container.Cleanup.GlobalFlags.Verbose)
		assert.Equal(t, container.Global.DryRun, container.Cleanup.GlobalFlags.DryRun)
	})
	
	t.Run("handles nil global flags", func(t *testing.T) {
		container := NewFlagContainer()
		container.Global = nil
		
		// Should not panic
		assert.NotPanics(t, func() {
			container.SyncGlobalFlags()
		})
	})
}

func TestFlagContainer_Reset(t *testing.T) {
	t.Run("resets all flags to zero values", func(t *testing.T) {
		container := NewFlagContainer()
		
		// Set some values
		container.Global.Verbose = true
		container.Create.ClusterType = "gke"
		container.Create.NodeCount = 5
		container.List.Quiet = true
		container.Delete.GlobalFlags.Force = true
		
		// Reset the container
		container.Reset()
		
		// Verify all flags are reset to zero values
		assert.False(t, container.Global.Verbose)
		assert.False(t, container.Global.DryRun)
		
		assert.Empty(t, container.Create.ClusterType)
		assert.Equal(t, 0, container.Create.NodeCount)
		assert.Empty(t, container.Create.K8sVersion)
		
		assert.False(t, container.List.Quiet)
		assert.False(t, container.Delete.GlobalFlags.Force)
	})
}

func TestFlagContainer_Executor(t *testing.T) {
	t.Run("can set and get executor", func(t *testing.T) {
		container := NewFlagContainer()
		mockExecutor := &MockCommandExecutor{}
		
		container.Executor = mockExecutor
		
		assert.Equal(t, mockExecutor, container.Executor)
	})
}

func TestFlagContainer_TestManager(t *testing.T) {
	t.Run("can set and get test manager", func(t *testing.T) {
		container := NewFlagContainer()
		mockExecutor := &MockCommandExecutor{}
		testManager := NewK3dManager(mockExecutor, false)
		
		container.TestManager = testManager
		
		assert.Equal(t, testManager, container.TestManager)
	})
}

func TestTypeReExports(t *testing.T) {
	t.Run("cluster types are properly re-exported", func(t *testing.T) {
		// Test that re-exported types match domain types
		var clusterType ClusterType = ClusterTypeK3d
		assert.Equal(t, domain.ClusterTypeK3d, clusterType)
		
		var domainType domain.ClusterType = ClusterTypeGKE
		assert.Equal(t, ClusterTypeGKE, domainType)
	})
	
	t.Run("cluster constants are properly re-exported", func(t *testing.T) {
		assert.Equal(t, domain.ClusterTypeK3d, ClusterTypeK3d)
		assert.Equal(t, domain.ClusterTypeGKE, ClusterTypeGKE)
		assert.Equal(t, domain.ClusterTypeEKS, ClusterTypeEKS)
	})
}

func TestClusterConfig(t *testing.T) {
	t.Run("can create and use cluster config", func(t *testing.T) {
		config := ClusterConfig{
			Name:       "test-cluster",
			Type:       ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "v1.25.0-k3s1",
		}
		
		assert.Equal(t, "test-cluster", config.Name)
		assert.Equal(t, ClusterTypeK3d, config.Type)
		assert.Equal(t, 3, config.NodeCount)
		assert.Equal(t, "v1.25.0-k3s1", config.K8sVersion)
	})
}

func TestClusterInfo(t *testing.T) {
	t.Run("can create and use cluster info", func(t *testing.T) {
		info := ClusterInfo{
			Name:      "test-cluster",
			Type:      ClusterTypeK3d,
			Status:    "running",
			NodeCount: 3,
			Nodes:     []NodeInfo{},
		}
		
		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, ClusterTypeK3d, info.Type)
		assert.Equal(t, "running", info.Status)
		assert.Equal(t, 3, info.NodeCount)
		assert.Empty(t, info.Nodes)
	})
}

func TestNodeInfo(t *testing.T) {
	t.Run("can create and use node info", func(t *testing.T) {
		node := NodeInfo{
			Name:   "test-node",
			Role:   "worker",
			Status: "ready",
		}
		
		assert.Equal(t, "test-node", node.Name)
		assert.Equal(t, "worker", node.Role)
		assert.Equal(t, "ready", node.Status)
	})
}

func TestProviderOptions(t *testing.T) {
	t.Run("can create and use provider options", func(t *testing.T) {
		options := ProviderOptions{
			K3d: &K3dOptions{
				PortMappings: []string{"8080:80@loadbalancer", "8443:443@loadbalancer"},
			},
			Verbose: true,
		}
		
		assert.NotNil(t, options.K3d)
		assert.Equal(t, []string{"8080:80@loadbalancer", "8443:443@loadbalancer"}, options.K3d.PortMappings)
		assert.True(t, options.Verbose)
	})
}

func TestErrorTypes(t *testing.T) {
	t.Run("cluster not found error", func(t *testing.T) {
		err := NewClusterNotFoundError("test-cluster")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "not found")
		
		// Test type assertion (check if error contains expected type)
		var clusterNotFoundErr ErrClusterNotFound
		assert.True(t, errors.As(err, &clusterNotFoundErr))
	})
	
	t.Run("provider not found error", func(t *testing.T) {
		err := NewProviderNotFoundError(ClusterTypeGKE)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "gke")
		assert.Contains(t, err.Error(), "no provider available")
		
		// Test type assertion (check if error contains expected type)
		var providerNotFoundErr ErrProviderNotFound
		assert.True(t, errors.As(err, &providerNotFoundErr))
	})
	
	t.Run("invalid config error", func(t *testing.T) {
		err := NewInvalidConfigError("name", "", "cluster name cannot be empty")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "name")
		assert.Contains(t, err.Error(), "cluster name cannot be empty")
		
		// Test type assertion (check if error contains expected type)
		var invalidConfigErr ErrInvalidClusterConfig
		assert.True(t, errors.As(err, &invalidConfigErr))
	})
	
	t.Run("cluster already exists error", func(t *testing.T) {
		err := NewClusterAlreadyExistsError("test-cluster")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "already exists")
		
		// Test type assertion (check if error contains expected type)
		var alreadyExistsErr ErrClusterAlreadyExists
		assert.True(t, errors.As(err, &alreadyExistsErr))
	})
	
	t.Run("cluster operation error", func(t *testing.T) {
		originalErr := assert.AnError
		err := NewClusterOperationError("create", "test-cluster", originalErr)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "create")
		assert.Contains(t, err.Error(), "test-cluster")
		
		// Test type assertion (check if error contains expected type)
		var operationErr ErrClusterOperation
		assert.True(t, errors.As(err, &operationErr))
	})
}

func TestInterface_ClusterService(t *testing.T) {
	t.Run("K3dManager implements ClusterService interface", func(t *testing.T) {
		mockExecutor := &MockCommandExecutor{}
		manager := NewK3dManager(mockExecutor, false)
		
		// Test that K3dManager implements ClusterService
		var _ ClusterService = manager
		
		// Verify interface methods exist
		assert.NotNil(t, manager.CreateCluster)
		assert.NotNil(t, manager.DeleteCluster)
		assert.NotNil(t, manager.StartCluster)
		assert.NotNil(t, manager.ListClusters)
		assert.NotNil(t, manager.GetClusterStatus)
		assert.NotNil(t, manager.DetectClusterType)
	})
}

func TestInterface_ClusterManager(t *testing.T) {
	t.Run("K3dManager implements ClusterManager interface", func(t *testing.T) {
		mockExecutor := &MockCommandExecutor{}
		manager := NewK3dManager(mockExecutor, false)
		
		// Test that K3dManager implements ClusterManager
		var _ ClusterManager = manager
		
		// Verify interface methods exist
		assert.NotNil(t, manager.DetectClusterType)
		assert.NotNil(t, manager.ListClusters)
		assert.NotNil(t, manager.ListAllClusters)
	})
}

func TestFlagTypes(t *testing.T) {
	t.Run("global flags", func(t *testing.T) {
		flags := &GlobalFlags{
			Verbose: true,
			DryRun:  true,
			Force:   true,
		}
		
		assert.True(t, flags.Verbose)
		assert.True(t, flags.DryRun)
		assert.True(t, flags.Force)
	})
	
	t.Run("create flags", func(t *testing.T) {
		flags := &CreateFlags{
			ClusterType: "k3d",
			NodeCount:   5,
			K8sVersion:  "v1.25.0-k3s1",
			SkipWizard:  true,
		}
		
		assert.Equal(t, "k3d", flags.ClusterType)
		assert.Equal(t, 5, flags.NodeCount)
		assert.Equal(t, "v1.25.0-k3s1", flags.K8sVersion)
		assert.True(t, flags.SkipWizard)
	})
	
	t.Run("delete flags", func(t *testing.T) {
		flags := &DeleteFlags{}
		flags.GlobalFlags.Force = true
		
		assert.True(t, flags.GlobalFlags.Force)
	})
	
	t.Run("list flags", func(t *testing.T) {
		flags := &ListFlags{
			Quiet: true,
		}
		
		assert.True(t, flags.Quiet)
	})
}