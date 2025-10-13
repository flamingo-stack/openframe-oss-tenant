package cluster

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestClusterService_getK3dClusterNodes(t *testing.T) {
	tests := []struct {
		name         string
		clusterName  string
		dockerOutput string
		shouldFail   bool
		expected     []string
		expectError  bool
	}{
		{
			name:        "empty cluster name",
			clusterName: "",
			expectError: true,
		},
		{
			name:         "no nodes found",
			clusterName:  "test-cluster",
			dockerOutput: "",
			expected:     []string{},
			expectError:  false,
		},
		{
			name:        "docker command fails",
			clusterName: "test-cluster",
			shouldFail:  true,
			expectError: true,
		},
		{
			name:        "successful node discovery",
			clusterName: "test-cluster",
			dockerOutput: `k3d-test-cluster-server-0
k3d-test-cluster-agent-0
k3d-test-cluster-agent-1
k3d-test-cluster-serverlb
k3d-test-cluster-tools`,
			expected: []string{
				"k3d-test-cluster-server-0",
				"k3d-test-cluster-agent-0",
				"k3d-test-cluster-agent-1",
			},
			expectError: false,
		},
		{
			name:        "mixed valid and invalid nodes",
			clusterName: "my-cluster",
			dockerOutput: `k3d-my-cluster-server-0
k3d-my-cluster-agent-0
k3d-my-cluster-serverlb
k3d-my-cluster-tools
some-other-container`,
			expected: []string{
				"k3d-my-cluster-server-0",
				"k3d-my-cluster-agent-0",
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock executor
			mockExec := executor.NewMockCommandExecutor()

			if tt.shouldFail {
				mockExec.SetShouldFail(true, "docker command failed")
			} else if tt.clusterName != "" {
				// Set up expected command call
				mockExec.SetResponse("docker ps", &executor.CommandResult{
					Stdout: tt.dockerOutput,
				})
			}

			service := NewClusterService(mockExec)

			result, err := service.getK3dClusterNodes(context.Background(), tt.clusterName)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestClusterService_filterK3dNodes(t *testing.T) {
	service := NewClusterService(executor.NewMockCommandExecutor())

	tests := []struct {
		name        string
		output      string
		clusterName string
		expected    []string
	}{
		{
			name:        "empty output",
			output:      "",
			clusterName: "test",
			expected:    []string{},
		},
		{
			name:        "whitespace only",
			output:      "   \n  \n  ",
			clusterName: "test",
			expected:    []string{},
		},
		{
			name:        "valid server and agent nodes",
			output:      "k3d-test-server-0\nk3d-test-agent-0\nk3d-test-agent-1",
			clusterName: "test",
			expected:    []string{"k3d-test-server-0", "k3d-test-agent-0", "k3d-test-agent-1"},
		},
		{
			name:        "mixed valid and invalid nodes",
			output:      "k3d-test-server-0\nk3d-test-serverlb\nk3d-test-agent-0\nk3d-test-tools\nother-container",
			clusterName: "test",
			expected:    []string{"k3d-test-server-0", "k3d-test-agent-0"},
		},
		{
			name:        "nodes with extra whitespace",
			output:      "  k3d-test-server-0  \n  k3d-test-agent-0  \n",
			clusterName: "test",
			expected:    []string{"k3d-test-server-0", "k3d-test-agent-0"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.filterK3dNodes(tt.output, tt.clusterName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestClusterService_isK3dWorkerNode(t *testing.T) {
	service := NewClusterService(executor.NewMockCommandExecutor())

	tests := []struct {
		name        string
		nodeName    string
		clusterName string
		expected    bool
	}{
		// Valid worker nodes
		{
			name:        "server node",
			nodeName:    "k3d-test-cluster-server-0",
			clusterName: "test-cluster",
			expected:    true,
		},
		{
			name:        "agent node",
			nodeName:    "k3d-test-cluster-agent-0",
			clusterName: "test-cluster",
			expected:    true,
		},
		{
			name:        "agent node with high number",
			nodeName:    "k3d-test-cluster-agent-5",
			clusterName: "test-cluster",
			expected:    true,
		},

		// Invalid nodes (infrastructure containers)
		{
			name:        "load balancer",
			nodeName:    "k3d-test-cluster-serverlb",
			clusterName: "test-cluster",
			expected:    false,
		},
		{
			name:        "tools container",
			nodeName:    "k3d-test-cluster-tools",
			clusterName: "test-cluster",
			expected:    false,
		},

		// Wrong cluster or format
		{
			name:        "wrong cluster prefix",
			nodeName:    "k3d-other-cluster-server-0",
			clusterName: "test-cluster",
			expected:    false,
		},
		{
			name:        "no k3d prefix",
			nodeName:    "test-cluster-server-0",
			clusterName: "test-cluster",
			expected:    false,
		},
		{
			name:        "completely different container",
			nodeName:    "nginx-container",
			clusterName: "test-cluster",
			expected:    false,
		},

		// Edge cases
		{
			name:        "empty node name",
			nodeName:    "",
			clusterName: "test-cluster",
			expected:    false,
		},
		{
			name:        "empty cluster name",
			nodeName:    "k3d-test-server-0",
			clusterName: "",
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.isK3dWorkerNode(tt.nodeName, tt.clusterName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestClusterService_cleanupDockerResources_Integration(t *testing.T) {
	// Integration test to verify the full flow works
	mockExec := executor.NewMockCommandExecutor()

	// Mock the node discovery
	mockExec.SetResponse("docker ps --filter label=k3d.cluster=test-cluster --filter status=running --format {{.Names}}", &executor.CommandResult{
		Stdout: "k3d-test-cluster-server-0\nk3d-test-cluster-agent-0\nk3d-test-cluster-serverlb",
	})

	// Mock the cleanup commands for each valid node
	mockExec.SetResponse("docker exec k3d-test-cluster-server-0 docker image prune -f", &executor.CommandResult{})
	mockExec.SetResponse("docker exec k3d-test-cluster-server-0 docker container prune -f", &executor.CommandResult{})
	mockExec.SetResponse("docker exec k3d-test-cluster-agent-0 docker image prune -f", &executor.CommandResult{})
	mockExec.SetResponse("docker exec k3d-test-cluster-agent-0 docker container prune -f", &executor.CommandResult{})

	service := NewClusterService(mockExec)

	err := service.cleanupDockerResources(context.Background(), "test-cluster", true, false)

	require.NoError(t, err, "cleanupDockerResources should succeed")

	// Verify all expected commands were called
	assert.True(t, mockExec.WasCommandExecuted("docker ps"))
	assert.True(t, mockExec.WasCommandExecuted("docker exec k3d-test-cluster-server-0 docker image prune -f"))
	assert.True(t, mockExec.WasCommandExecuted("docker exec k3d-test-cluster-server-0 docker container prune -f"))
	assert.True(t, mockExec.WasCommandExecuted("docker exec k3d-test-cluster-agent-0 docker image prune -f"))
	assert.True(t, mockExec.WasCommandExecuted("docker exec k3d-test-cluster-agent-0 docker container prune -f"))

	// Verify serverlb commands were NOT called (filtered out)
	assert.False(t, mockExec.WasCommandExecuted("docker exec k3d-test-cluster-serverlb docker image prune -f"))
	assert.False(t, mockExec.WasCommandExecuted("docker exec k3d-test-cluster-serverlb docker container prune -f"))
}
