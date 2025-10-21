package cluster

import (
	"errors"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/providers/k3d"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
)

func TestNewFlagContainer(t *testing.T) {
	t.Run("creates container with default values", func(t *testing.T) {
		container := NewFlagContainer()

		assert.NotNil(t, container)
		assert.NotNil(t, container.Global)
		assert.NotNil(t, container.Create)
		assert.NotNil(t, container.List)
		assert.NotNil(t, container.Status)
		assert.NotNil(t, container.Delete)
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
		mockExecutor := executor.NewMockCommandExecutor()

		container.Executor = mockExecutor

		assert.Equal(t, mockExecutor, container.Executor)
	})
}

func TestFlagContainer_TestManager(t *testing.T) {
	t.Run("can set and get test manager", func(t *testing.T) {
		container := NewFlagContainer()
		mockExecutor := executor.NewMockCommandExecutor()
		testManager := k3d.NewK3dManager(mockExecutor, false)

		container.TestManager = testManager

		assert.Equal(t, testManager, container.TestManager)
	})
}

func TestDomainTypes(t *testing.T) {
	t.Run("domain types work correctly", func(t *testing.T) {
		// Test that domain types are accessible
		var clusterType models.ClusterType = models.ClusterTypeK3d
		assert.Equal(t, models.ClusterTypeK3d, clusterType)

		var domainType models.ClusterType = models.ClusterTypeGKE
		assert.Equal(t, models.ClusterTypeGKE, domainType)
	})

	t.Run("domain constants are correct", func(t *testing.T) {
		// Test that domain constants have expected values
		assert.Equal(t, "k3d", string(models.ClusterTypeK3d))
		assert.Equal(t, "gke", string(models.ClusterTypeGKE))
	})
}

func TestClusterConfig(t *testing.T) {
	t.Run("can create and use cluster config", func(t *testing.T) {
		config := models.ClusterConfig{
			Name:       "test-cluster",
			Type:       models.ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "v1.25.0-k3s1",
		}

		assert.Equal(t, "test-cluster", config.Name)
		assert.Equal(t, models.ClusterTypeK3d, config.Type)
		assert.Equal(t, 3, config.NodeCount)
		assert.Equal(t, "v1.25.0-k3s1", config.K8sVersion)
	})
}

func TestClusterInfo(t *testing.T) {
	t.Run("can create and use cluster info", func(t *testing.T) {
		info := models.ClusterInfo{
			Name:      "test-cluster",
			Type:      models.ClusterTypeK3d,
			Status:    "running",
			NodeCount: 3,
			Nodes:     []models.NodeInfo{},
		}

		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, models.ClusterTypeK3d, info.Type)
		assert.Equal(t, "running", info.Status)
		assert.Equal(t, 3, info.NodeCount)
		assert.Empty(t, info.Nodes)
	})
}

func TestNodeInfo(t *testing.T) {
	t.Run("can create and use node info", func(t *testing.T) {
		node := models.NodeInfo{
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
		options := models.ProviderOptions{
			K3d: &models.K3dOptions{
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
		err := models.NewClusterNotFoundError("test-cluster")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "not found")

		// Test type assertion (check if error contains expected type)
		var clusterNotFoundErr models.ErrClusterNotFound
		assert.True(t, errors.As(err, &clusterNotFoundErr))
	})

	t.Run("provider not found error", func(t *testing.T) {
		err := models.NewProviderNotFoundError(models.ClusterTypeGKE)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "gke")
		assert.Contains(t, err.Error(), "no provider available")

		// Test type assertion (check if error contains expected type)
		var providerNotFoundErr models.ErrProviderNotFound
		assert.True(t, errors.As(err, &providerNotFoundErr))
	})

	t.Run("invalid config error", func(t *testing.T) {
		err := models.NewInvalidConfigError("name", "", "cluster name cannot be empty")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "name")
		assert.Contains(t, err.Error(), "cluster name cannot be empty")

		// Test type assertion (check if error contains expected type)
		var invalidConfigErr models.ErrInvalidClusterConfig
		assert.True(t, errors.As(err, &invalidConfigErr))
	})

	t.Run("cluster already exists error", func(t *testing.T) {
		err := models.NewClusterAlreadyExistsError("test-cluster")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "already exists")

		// Test type assertion (check if error contains expected type)
		var alreadyExistsErr models.ErrClusterAlreadyExists
		assert.True(t, errors.As(err, &alreadyExistsErr))
	})

	t.Run("cluster operation error", func(t *testing.T) {
		originalErr := assert.AnError
		err := models.NewClusterOperationError("create", "test-cluster", originalErr)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "create")
		assert.Contains(t, err.Error(), "test-cluster")

		// Test type assertion (check if error contains expected type)
		var operationErr models.ErrClusterOperation
		assert.True(t, errors.As(err, &operationErr))
	})
}

func TestInterface_ClusterService(t *testing.T) {
	t.Run("K3dManager implements ClusterService interface", func(t *testing.T) {
		mockExecutor := executor.NewMockCommandExecutor()
		manager := k3d.NewK3dManager(mockExecutor, false)

		// Test that K3dManager implements ClusterService
		var _ models.ClusterService = manager

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
		mockExecutor := executor.NewMockCommandExecutor()
		manager := k3d.NewK3dManager(mockExecutor, false)

		// Test that K3dManager implements ClusterManager
		var _ k3d.ClusterManager = manager

		// Verify interface methods exist
		assert.NotNil(t, manager.DetectClusterType)
		assert.NotNil(t, manager.ListClusters)
		assert.NotNil(t, manager.ListAllClusters)
	})
}

func TestFlagTypes(t *testing.T) {
	t.Run("global flags", func(t *testing.T) {
		flags := &models.GlobalFlags{
			Verbose: true,
			DryRun:  true,
			Force:   true,
		}

		assert.True(t, flags.Verbose)
		assert.True(t, flags.DryRun)
		assert.True(t, flags.Force)
	})

	t.Run("create flags", func(t *testing.T) {
		flags := &models.CreateFlags{
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
		flags := &models.DeleteFlags{}
		flags.GlobalFlags.Force = true

		assert.True(t, flags.GlobalFlags.Force)
	})

	t.Run("list flags", func(t *testing.T) {
		flags := &models.ListFlags{
			Quiet: true,
		}

		assert.True(t, flags.Quiet)
	})
}
