package k3d

import (
	"context"
	"errors"
	"strconv"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	execPkg "github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockExecutor is a mock implementation of CommandExecutor for testing
type MockExecutor struct {
	mock.Mock
}

func (m *MockExecutor) Execute(ctx context.Context, name string, args ...string) (*execPkg.CommandResult, error) {
	arguments := m.Called(ctx, name, args)
	if arguments.Get(0) == nil {
		return nil, arguments.Error(1)
	}
	return arguments.Get(0).(*execPkg.CommandResult), arguments.Error(1)
}

func (m *MockExecutor) ExecuteWithOptions(ctx context.Context, options execPkg.ExecuteOptions) (*execPkg.CommandResult, error) {
	arguments := m.Called(ctx, options)
	if arguments.Get(0) == nil {
		return nil, arguments.Error(1)
	}
	return arguments.Get(0).(*execPkg.CommandResult), arguments.Error(1)
}

func TestNewK3dManager(t *testing.T) {
	executor := &MockExecutor{}

	t.Run("creates manager with executor", func(t *testing.T) {
		manager := NewK3dManager(executor, false)

		assert.NotNil(t, manager)
		assert.Equal(t, executor, manager.executor)
		assert.False(t, manager.verbose)
	})

	t.Run("creates manager with verbose mode", func(t *testing.T) {
		manager := NewK3dManager(executor, true)

		assert.NotNil(t, manager)
		assert.True(t, manager.verbose)
	})
}

func TestCreateClusterManagerWithExecutor(t *testing.T) {
	t.Run("creates manager with executor", func(t *testing.T) {
		executor := &MockExecutor{}
		manager := CreateClusterManagerWithExecutor(executor)

		assert.NotNil(t, manager)
		assert.Equal(t, executor, manager.executor)
		assert.False(t, manager.verbose) // Default to non-verbose
	})

	t.Run("panics with nil executor", func(t *testing.T) {
		assert.Panics(t, func() {
			CreateClusterManagerWithExecutor(nil)
		})
	})
}

func TestCreateDefaultClusterManager(t *testing.T) {
	t.Run("panics as expected", func(t *testing.T) {
		assert.Panics(t, func() {
			CreateDefaultClusterManager()
		})
	})
}

func TestK3dManager_CreateCluster(t *testing.T) {
	tests := []struct {
		name          string
		config        models.ClusterConfig
		setupMock     func(*MockExecutor)
		expectedError string
		expectedArgs  []string
	}{
		{
			name: "successful cluster creation",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeK3d,
				NodeCount: 3,
			},
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", mock.Anything).Return(&execPkg.CommandResult{Stdout: "success"}, nil)
				m.On("Execute", mock.Anything, "kubectl", mock.Anything).Return(&execPkg.CommandResult{Stdout: "Switched to context \"k3d-test-cluster\"."}, nil)
			},
		},
		{
			name: "cluster creation with k8s version",
			config: models.ClusterConfig{
				Name:       "test-cluster",
				Type:       models.ClusterTypeK3d,
				NodeCount:  2,
				K8sVersion: "v1.25.0-k3s1",
			},
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", mock.Anything).Return(&execPkg.CommandResult{Stdout: "success"}, nil)
				m.On("Execute", mock.Anything, "kubectl", mock.Anything).Return(&execPkg.CommandResult{Stdout: "Switched to context \"k3d-test-cluster\"."}, nil)
			},
		},
		{
			name: "empty cluster name",
			config: models.ClusterConfig{
				Name:      "",
				Type:      models.ClusterTypeK3d,
				NodeCount: 3,
			},
			expectedError: "cluster name cannot be empty",
		},
		{
			name: "invalid cluster type",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeGKE,
				NodeCount: 3,
			},
			expectedError: "no provider available for cluster type 'gke'",
		},
		{
			name: "zero node count",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeK3d,
				NodeCount: 0,
			},
			expectedError: "node count must be at least 1",
		},
		{
			name: "k3d command fails",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeK3d,
				NodeCount: 3,
			},
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", mock.Anything).Return(nil, errors.New("k3d error"))
			},
			expectedError: "failed to create cluster test-cluster",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			executor := &MockExecutor{}
			if tt.setupMock != nil {
				tt.setupMock(executor)
			}

			manager := NewK3dManager(executor, false)
			err := manager.CreateCluster(context.Background(), tt.config)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			executor.AssertExpectations(t)
		})
	}
}

func TestK3dManager_CreateCluster_VerboseMode(t *testing.T) {
	executor := &MockExecutor{}
	executor.On("Execute", mock.Anything, "k3d", mock.Anything).Return(&execPkg.CommandResult{Stdout: "success"}, nil)
	executor.On("Execute", mock.Anything, "kubectl", mock.Anything).Return(&execPkg.CommandResult{Stdout: "Switched to context \"k3d-test-cluster\"."}, nil)

	manager := NewK3dManager(executor, true) // verbose mode
	config := models.ClusterConfig{
		Name:      "test-cluster",
		Type:      models.ClusterTypeK3d,
		NodeCount: 3,
	}

	err := manager.CreateCluster(context.Background(), config)
	assert.NoError(t, err)
	executor.AssertExpectations(t)
}

func TestK3dManager_DeleteCluster(t *testing.T) {
	tests := []struct {
		name          string
		clusterName   string
		clusterType   models.ClusterType
		force         bool
		setupMock     func(*MockExecutor)
		expectedError string
	}{
		{
			name:        "successful cluster deletion",
			clusterName: "test-cluster",
			clusterType: models.ClusterTypeK3d,
			force:       false,
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", []string{"cluster", "delete", "test-cluster"}).Return(&execPkg.CommandResult{Stdout: "success"}, nil)
			},
		},
		{
			name:          "empty cluster name",
			clusterName:   "",
			clusterType:   models.ClusterTypeK3d,
			expectedError: "cluster name cannot be empty",
		},
		{
			name:          "invalid cluster type",
			clusterName:   "test-cluster",
			clusterType:   models.ClusterTypeGKE,
			expectedError: "no provider available for cluster type 'gke'",
		},
		{
			name:        "k3d command fails",
			clusterName: "test-cluster",
			clusterType: models.ClusterTypeK3d,
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", mock.Anything).Return(nil, errors.New("k3d error"))
			},
			expectedError: "failed to delete cluster test-cluster",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			executor := &MockExecutor{}
			if tt.setupMock != nil {
				tt.setupMock(executor)
			}

			manager := NewK3dManager(executor, false)
			err := manager.DeleteCluster(context.Background(), tt.clusterName, tt.clusterType, tt.force)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			executor.AssertExpectations(t)
		})
	}
}

func TestK3dManager_StartCluster(t *testing.T) {
	tests := []struct {
		name          string
		clusterName   string
		clusterType   models.ClusterType
		setupMock     func(*MockExecutor)
		expectedError string
	}{
		{
			name:        "successful cluster start",
			clusterName: "test-cluster",
			clusterType: models.ClusterTypeK3d,
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", []string{"cluster", "start", "test-cluster"}).Return(&execPkg.CommandResult{Stdout: "success"}, nil)
			},
		},
		{
			name:          "empty cluster name",
			clusterName:   "",
			clusterType:   models.ClusterTypeK3d,
			expectedError: "cluster name cannot be empty",
		},
		{
			name:          "invalid cluster type",
			clusterName:   "test-cluster",
			clusterType:   models.ClusterTypeGKE,
			expectedError: "no provider available for cluster type 'gke'",
		},
		{
			name:        "k3d command fails",
			clusterName: "test-cluster",
			clusterType: models.ClusterTypeK3d,
			setupMock: func(m *MockExecutor) {
				m.On("Execute", mock.Anything, "k3d", mock.Anything).Return(nil, errors.New("k3d error"))
			},
			expectedError: "failed to start cluster test-cluster",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			executor := &MockExecutor{}
			if tt.setupMock != nil {
				tt.setupMock(executor)
			}

			manager := NewK3dManager(executor, false)
			err := manager.StartCluster(context.Background(), tt.clusterName, tt.clusterType)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}

			executor.AssertExpectations(t)
		})
	}
}

func TestK3dManager_ListClusters(t *testing.T) {
	t.Run("successful cluster listing", func(t *testing.T) {
		executor := &MockExecutor{}
		jsonOutput := `[
			{
				"name": "cluster1",
				"serversCount": 1,
				"serversRunning": 1,
				"agentsCount": 2,
				"agentsRunning": 2,
				"image": "rancher/k3s:latest"
			},
			{
				"name": "cluster2",
				"serversCount": 1,
				"serversRunning": 0,
				"agentsCount": 1,
				"agentsRunning": 0,
				"image": "rancher/k3s:v1.25.0"
			}
		]`

		executor.On("Execute", mock.Anything, "k3d", []string{"cluster", "list", "--output", "json"}).Return(&execPkg.CommandResult{Stdout: jsonOutput}, nil)

		manager := NewK3dManager(executor, false)
		clusters, err := manager.ListClusters(context.Background())

		assert.NoError(t, err)
		assert.Len(t, clusters, 2)

		assert.Equal(t, "cluster1", clusters[0].Name)
		assert.Equal(t, models.ClusterTypeK3d, clusters[0].Type)
		assert.Equal(t, "1/1", clusters[0].Status)
		assert.Equal(t, 3, clusters[0].NodeCount) // 1 server + 2 agents

		assert.Equal(t, "cluster2", clusters[1].Name)
		assert.Equal(t, models.ClusterTypeK3d, clusters[1].Type)
		assert.Equal(t, "0/1", clusters[1].Status)
		assert.Equal(t, 2, clusters[1].NodeCount) // 1 server + 1 agent

		executor.AssertExpectations(t)
	})

	t.Run("k3d command fails", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", mock.Anything).Return(nil, errors.New("k3d error"))

		manager := NewK3dManager(executor, false)
		clusters, err := manager.ListClusters(context.Background())

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to list clusters")
		assert.Nil(t, clusters)

		executor.AssertExpectations(t)
	})

	t.Run("invalid JSON response", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", mock.Anything).Return(&execPkg.CommandResult{Stdout: "invalid json"}, nil)

		manager := NewK3dManager(executor, false)
		clusters, err := manager.ListClusters(context.Background())

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to parse cluster list JSON")
		assert.Nil(t, clusters)

		executor.AssertExpectations(t)
	})
}

func TestK3dManager_ListAllClusters(t *testing.T) {
	t.Run("calls ListClusters", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", []string{"cluster", "list", "--output", "json"}).Return(&execPkg.CommandResult{Stdout: "[]"}, nil)

		manager := NewK3dManager(executor, false)
		clusters, err := manager.ListAllClusters(context.Background())

		assert.NoError(t, err)
		assert.Empty(t, clusters)

		executor.AssertExpectations(t)
	})
}

func TestK3dManager_GetClusterStatus(t *testing.T) {
	t.Run("successful status retrieval", func(t *testing.T) {
		executor := &MockExecutor{}
		jsonOutput := `[
			{
				"name": "test-cluster",
				"serversCount": 1,
				"serversRunning": 1,
				"agentsCount": 2,
				"agentsRunning": 2,
				"image": "rancher/k3s:latest"
			}
		]`

		executor.On("Execute", mock.Anything, "k3d", []string{"cluster", "list", "--output", "json"}).Return(&execPkg.CommandResult{Stdout: jsonOutput}, nil)

		manager := NewK3dManager(executor, false)
		clusterInfo, err := manager.GetClusterStatus(context.Background(), "test-cluster")

		assert.NoError(t, err)
		assert.Equal(t, "test-cluster", clusterInfo.Name)
		assert.Equal(t, models.ClusterTypeK3d, clusterInfo.Type)
		assert.Equal(t, "1/1", clusterInfo.Status)

		executor.AssertExpectations(t)
	})

	t.Run("empty cluster name", func(t *testing.T) {
		executor := &MockExecutor{}
		manager := NewK3dManager(executor, false)

		clusterInfo, err := manager.GetClusterStatus(context.Background(), "")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty")
		assert.Equal(t, models.ClusterInfo{}, clusterInfo)
	})

	t.Run("cluster not found", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", []string{"cluster", "list", "--output", "json"}).Return(&execPkg.CommandResult{Stdout: "[]"}, nil)

		manager := NewK3dManager(executor, false)
		clusterInfo, err := manager.GetClusterStatus(context.Background(), "non-existent")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster non-existent not found")
		assert.Equal(t, models.ClusterInfo{}, clusterInfo)

		executor.AssertExpectations(t)
	})
}

func TestK3dManager_DetectClusterType(t *testing.T) {
	t.Run("successful cluster detection", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", []string{"cluster", "get", "test-cluster"}).Return(&execPkg.CommandResult{Stdout: "cluster info"}, nil)

		manager := NewK3dManager(executor, false)
		clusterType, err := manager.DetectClusterType(context.Background(), "test-cluster")

		assert.NoError(t, err)
		assert.Equal(t, models.ClusterTypeK3d, clusterType)

		executor.AssertExpectations(t)
	})

	t.Run("empty cluster name", func(t *testing.T) {
		executor := &MockExecutor{}
		manager := NewK3dManager(executor, false)

		clusterType, err := manager.DetectClusterType(context.Background(), "")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty")
		assert.Equal(t, models.ClusterType(""), clusterType)
	})

	t.Run("cluster not found", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", mock.Anything).Return(nil, errors.New("cluster not found"))

		manager := NewK3dManager(executor, false)
		clusterType, err := manager.DetectClusterType(context.Background(), "non-existent")

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster 'non-existent' not found")
		assert.Equal(t, models.ClusterType(""), clusterType)

		executor.AssertExpectations(t)
	})
}

func TestK3dManager_GetKubeconfig(t *testing.T) {
	t.Run("successful kubeconfig retrieval", func(t *testing.T) {
		executor := &MockExecutor{}
		kubeconfigContent := "apiVersion: v1\nkind: Config\n..."
		executor.On("Execute", mock.Anything, "k3d", []string{"kubeconfig", "get", "test-cluster"}).Return(&execPkg.CommandResult{Stdout: kubeconfigContent}, nil)

		manager := NewK3dManager(executor, false)
		kubeconfig, err := manager.GetKubeconfig(context.Background(), "test-cluster", models.ClusterTypeK3d)

		assert.NoError(t, err)
		assert.Equal(t, kubeconfigContent, kubeconfig)

		executor.AssertExpectations(t)
	})

	t.Run("unsupported cluster type", func(t *testing.T) {
		executor := &MockExecutor{}
		manager := NewK3dManager(executor, false)

		kubeconfig, err := manager.GetKubeconfig(context.Background(), "test-cluster", models.ClusterTypeGKE)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "no provider available for cluster type 'gke'")
		assert.Empty(t, kubeconfig)
	})

	t.Run("k3d command fails", func(t *testing.T) {
		executor := &MockExecutor{}
		executor.On("Execute", mock.Anything, "k3d", mock.Anything).Return(nil, errors.New("k3d error"))

		manager := NewK3dManager(executor, false)
		kubeconfig, err := manager.GetKubeconfig(context.Background(), "test-cluster", models.ClusterTypeK3d)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to get kubeconfig for cluster test-cluster")
		assert.Empty(t, kubeconfig)

		executor.AssertExpectations(t)
	})
}

func TestK3dManager_validateClusterConfig(t *testing.T) {
	manager := &K3dManager{}

	tests := []struct {
		name          string
		config        models.ClusterConfig
		expectedError string
	}{
		{
			name: "valid config",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeK3d,
				NodeCount: 3,
			},
		},
		{
			name: "empty name",
			config: models.ClusterConfig{
				Name:      "",
				Type:      models.ClusterTypeK3d,
				NodeCount: 3,
			},
			expectedError: "cluster name cannot be empty",
		},
		{
			name: "empty type",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      "",
				NodeCount: 3,
			},
			expectedError: "cluster type cannot be empty",
		},
		{
			name: "zero node count",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeK3d,
				NodeCount: 0,
			},
			expectedError: "node count must be at least 1",
		},
		{
			name: "negative node count",
			config: models.ClusterConfig{
				Name:      "test-cluster",
				Type:      models.ClusterTypeK3d,
				NodeCount: -1,
			},
			expectedError: "node count must be at least 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := manager.validateClusterConfig(tt.config)

			if tt.expectedError != "" {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// parseNodeCount is a helper function that calculates total node count from agents and servers
// This mimics the logic in k3d_manager.go: NodeCount: k3dCluster.AgentsCount + k3dCluster.ServersCount
func parseNodeCount(agents, servers string) int {
	agentCount, err := strconv.Atoi(agents)
	if err != nil {
		agentCount = 0
	}

	serverCount, err := strconv.Atoi(servers)
	if err != nil {
		serverCount = 0
	}

	return agentCount + serverCount
}

func TestParseNodeCount(t *testing.T) {
	tests := []struct {
		name     string
		agents   string
		servers  string
		expected int
	}{
		{
			name:     "valid counts",
			agents:   "2",
			servers:  "1",
			expected: 3,
		},
		{
			name:     "zero agents",
			agents:   "0",
			servers:  "1",
			expected: 1,
		},
		{
			name:     "invalid agents",
			agents:   "invalid",
			servers:  "1",
			expected: 1,
		},
		{
			name:     "invalid servers",
			agents:   "2",
			servers:  "invalid",
			expected: 2,
		},
		{
			name:     "both invalid",
			agents:   "invalid",
			servers:  "invalid",
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseNodeCount(tt.agents, tt.servers)
			assert.Equal(t, tt.expected, result)
		})
	}
}
