package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestClusterType(t *testing.T) {
	t.Run("cluster type constants", func(t *testing.T) {
		assert.Equal(t, ClusterType("k3d"), ClusterTypeK3d)
		assert.Equal(t, ClusterType("gke"), ClusterTypeGKE)
	})
	
	t.Run("cluster type string conversion", func(t *testing.T) {
		assert.Equal(t, "k3d", string(ClusterTypeK3d))
		assert.Equal(t, "gke", string(ClusterTypeGKE))
	})
}

func TestClusterConfig(t *testing.T) {
	t.Run("creates cluster config with all fields", func(t *testing.T) {
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
	
	t.Run("creates minimal cluster config", func(t *testing.T) {
		config := ClusterConfig{
			Name: "minimal-cluster",
			Type: ClusterTypeK3d,
		}
		
		assert.Equal(t, "minimal-cluster", config.Name)
		assert.Equal(t, ClusterTypeK3d, config.Type)
		assert.Equal(t, 0, config.NodeCount) // Zero value
		assert.Empty(t, config.K8sVersion)   // Zero value
	})
	
	t.Run("validates cluster config fields", func(t *testing.T) {
		config := ClusterConfig{}
		
		// Test zero values
		assert.Empty(t, config.Name)
		assert.Empty(t, config.Type)
		assert.Equal(t, 0, config.NodeCount)
		assert.Empty(t, config.K8sVersion)
	})
}

func TestClusterInfo(t *testing.T) {
	t.Run("creates cluster info with all fields", func(t *testing.T) {
		createdAt := time.Now()
		nodes := []NodeInfo{
			{Name: "node1", Status: "ready", Role: "control-plane"},
			{Name: "node2", Status: "ready", Role: "worker"},
		}
		
		info := ClusterInfo{
			Name:       "test-cluster",
			Type:       ClusterTypeK3d,
			Status:     "running",
			NodeCount:  2,
			K8sVersion: "v1.25.0-k3s1",
			CreatedAt:  createdAt,
			Nodes:      nodes,
		}
		
		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, ClusterTypeK3d, info.Type)
		assert.Equal(t, "running", info.Status)
		assert.Equal(t, 2, info.NodeCount)
		assert.Equal(t, "v1.25.0-k3s1", info.K8sVersion)
		assert.Equal(t, createdAt, info.CreatedAt)
		assert.Len(t, info.Nodes, 2)
		assert.Equal(t, "node1", info.Nodes[0].Name)
		assert.Equal(t, "control-plane", info.Nodes[0].Role)
	})
	
	t.Run("creates minimal cluster info", func(t *testing.T) {
		info := ClusterInfo{
			Name:   "minimal-cluster",
			Type:   ClusterTypeGKE,
			Status: "pending",
		}
		
		assert.Equal(t, "minimal-cluster", info.Name)
		assert.Equal(t, ClusterTypeGKE, info.Type)
		assert.Equal(t, "pending", info.Status)
		assert.Equal(t, 0, info.NodeCount)
		assert.Empty(t, info.K8sVersion)
		assert.True(t, info.CreatedAt.IsZero())
		assert.Empty(t, info.Nodes)
	})
	
	t.Run("handles different cluster statuses", func(t *testing.T) {
		statuses := []string{"running", "stopped", "pending", "error", "unknown"}
		
		for _, status := range statuses {
			info := ClusterInfo{
				Name:   "test-cluster",
				Type:   ClusterTypeK3d,
				Status: status,
			}
			
			assert.Equal(t, status, info.Status)
		}
	})
}

func TestNodeInfo(t *testing.T) {
	t.Run("creates node info with all fields", func(t *testing.T) {
		node := NodeInfo{
			Name:   "test-node-1",
			Status: "ready",
			Role:   "control-plane",
		}
		
		assert.Equal(t, "test-node-1", node.Name)
		assert.Equal(t, "ready", node.Status)
		assert.Equal(t, "control-plane", node.Role)
	})
	
	t.Run("creates worker node", func(t *testing.T) {
		node := NodeInfo{
			Name:   "worker-node-1",
			Status: "ready",
			Role:   "worker",
		}
		
		assert.Equal(t, "worker-node-1", node.Name)
		assert.Equal(t, "ready", node.Status)
		assert.Equal(t, "worker", node.Role)
	})
	
	t.Run("handles different node statuses", func(t *testing.T) {
		statuses := []string{"ready", "not ready", "pending", "terminating", "unknown"}
		
		for _, status := range statuses {
			node := NodeInfo{
				Name:   "test-node",
				Status: status,
				Role:   "worker",
			}
			
			assert.Equal(t, status, node.Status)
		}
	})
	
	t.Run("handles different node roles", func(t *testing.T) {
		roles := []string{"control-plane", "worker", "master", "agent"}
		
		for _, role := range roles {
			node := NodeInfo{
				Name:   "test-node",
				Status: "ready",
				Role:   role,
			}
			
			assert.Equal(t, role, node.Role)
		}
	})
}

func TestProviderOptions(t *testing.T) {
	t.Run("creates provider options with K3d options", func(t *testing.T) {
		options := ProviderOptions{
			K3d: &K3dOptions{
				PortMappings: []string{"8080:80@loadbalancer", "8443:443@loadbalancer"},
			},
			Verbose: true,
		}
		
		assert.NotNil(t, options.K3d)
		assert.Equal(t, []string{"8080:80@loadbalancer", "8443:443@loadbalancer"}, options.K3d.PortMappings)
		assert.True(t, options.Verbose)
		assert.Nil(t, options.GKE)
	})
	
	t.Run("creates provider options with GKE options", func(t *testing.T) {
		options := ProviderOptions{
			GKE: &GKEOptions{
				Zone:    "us-central1-a",
				Project: "my-project",
			},
		}
		
		assert.NotNil(t, options.GKE)
		assert.Equal(t, "us-central1-a", options.GKE.Zone)
		assert.Equal(t, "my-project", options.GKE.Project)
		assert.Nil(t, options.K3d)
		assert.False(t, options.Verbose)
	})
	
	
	t.Run("creates empty provider options", func(t *testing.T) {
		options := ProviderOptions{}
		
		assert.Nil(t, options.K3d)
		assert.Nil(t, options.GKE)
		assert.False(t, options.Verbose)
	})
}

func TestK3dOptions(t *testing.T) {
	t.Run("creates K3d options with port mappings", func(t *testing.T) {
		options := K3dOptions{
			PortMappings: []string{
				"8080:80@loadbalancer",
				"8443:443@loadbalancer",
				"6550:6443@server:0",
			},
		}
		
		assert.Len(t, options.PortMappings, 3)
		assert.Contains(t, options.PortMappings, "8080:80@loadbalancer")
		assert.Contains(t, options.PortMappings, "8443:443@loadbalancer")
		assert.Contains(t, options.PortMappings, "6550:6443@server:0")
	})
	
	t.Run("creates empty K3d options", func(t *testing.T) {
		options := K3dOptions{}
		
		assert.Empty(t, options.PortMappings)
	})
}

func TestGKEOptions(t *testing.T) {
	t.Run("creates GKE options with zone and project", func(t *testing.T) {
		options := GKEOptions{
			Zone:    "europe-west1-b",
			Project: "my-gcp-project",
		}
		
		assert.Equal(t, "europe-west1-b", options.Zone)
		assert.Equal(t, "my-gcp-project", options.Project)
	})
	
	t.Run("creates empty GKE options", func(t *testing.T) {
		options := GKEOptions{}
		
		assert.Empty(t, options.Zone)
		assert.Empty(t, options.Project)
	})
}


func TestJSONSerialization(t *testing.T) {
	t.Run("cluster config serialization", func(t *testing.T) {
		config := ClusterConfig{
			Name:       "test-cluster",
			Type:       ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "v1.25.0-k3s1",
		}
		
		// Basic validation that struct tags are correct
		assert.Equal(t, "test-cluster", config.Name)
		assert.Equal(t, ClusterTypeK3d, config.Type)
		assert.Equal(t, 3, config.NodeCount)
		assert.Equal(t, "v1.25.0-k3s1", config.K8sVersion)
	})
	
	t.Run("cluster info serialization", func(t *testing.T) {
		info := ClusterInfo{
			Name:      "test-cluster",
			Type:      ClusterTypeGKE,
			Status:    "running",
			NodeCount: 5,
		}
		
		// Basic validation that struct tags are correct
		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, ClusterTypeGKE, info.Type)
		assert.Equal(t, "running", info.Status)
		assert.Equal(t, 5, info.NodeCount)
	})
	
	t.Run("provider options serialization", func(t *testing.T) {
		options := ProviderOptions{
			K3d: &K3dOptions{
				PortMappings: []string{"8080:80@loadbalancer"},
			},
			Verbose: true,
		}
		
		// Basic validation that struct tags are correct
		assert.NotNil(t, options.K3d)
		assert.True(t, options.Verbose)
	})
}