package ui

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewDisplayService(t *testing.T) {
	t.Run("creates new display service", func(t *testing.T) {
		service := NewDisplayService()
		assert.NotNil(t, service)
		assert.IsType(t, &DisplayService{}, service)
	})
}

func TestDisplayService_ShowClusterCreationStart(t *testing.T) {
	t.Run("displays cluster creation start message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterCreationStart("test-cluster", "k3d", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Creating k3d cluster 'test-cluster'...")
	})
	
	t.Run("handles empty cluster name and type", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterCreationStart("", "", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Creating  cluster ''...")
	})
}

func TestDisplayService_ShowClusterCreationSuccess(t *testing.T) {
	t.Run("displays cluster creation success message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterCreationSuccess("test-cluster", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Cluster 'test-cluster' created successfully!")
	})
	
	t.Run("handles empty cluster name", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterCreationSuccess("", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Cluster '' created successfully!")
	})
}

func TestDisplayService_ShowClusterDeletionStart(t *testing.T) {
	t.Run("displays cluster deletion start message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterDeletionStart("test-cluster", "k3d", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Deleting k3d cluster 'test-cluster'...")
	})
	
	t.Run("handles different cluster types", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterDeletionStart("gke-cluster", "gke", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Deleting gke cluster 'gke-cluster'...")
	})
}

func TestDisplayService_ShowClusterDeletionSuccess(t *testing.T) {
	t.Run("displays cluster deletion success message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterDeletionSuccess("test-cluster", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Cluster 'test-cluster' deleted successfully!")
	})
}

func TestDisplayService_ShowClusterStartInProgress(t *testing.T) {
	t.Run("displays cluster start in progress message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterStartInProgress("test-cluster", "k3d", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Starting k3d cluster 'test-cluster'...")
	})
}

func TestDisplayService_ShowClusterStartSuccess(t *testing.T) {
	t.Run("displays cluster start success message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		service.ShowClusterStartSuccess("test-cluster", &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Cluster 'test-cluster' started successfully!")
	})
}

func TestDisplayService_ShowClusterList(t *testing.T) {
	t.Run("displays cluster list with multiple clusters", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		clusters := []ClusterDisplayInfo{
			{
				Name:      "cluster1",
				Type:      "k3d",
				Status:    "running",
				NodeCount: 3,
				CreatedAt: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
			},
			{
				Name:      "cluster2",
				Type:      "gke",
				Status:    "stopped",
				NodeCount: 5,
				CreatedAt: time.Date(2023, 1, 2, 14, 30, 0, 0, time.UTC),
			},
		}
		
		service.ShowClusterList(clusters, &buf)
		
		output := buf.String()
		assert.Contains(t, output, "cluster1")
		assert.Contains(t, output, "cluster2")
		assert.Contains(t, output, "k3d")
		assert.Contains(t, output, "gke")
		assert.Contains(t, output, "running")
		assert.Contains(t, output, "stopped")
		assert.Contains(t, output, "3")
		assert.Contains(t, output, "5")
	})
	
	t.Run("displays no clusters message when list is empty", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		clusters := []ClusterDisplayInfo{}
		
		service.ShowClusterList(clusters, &buf)
		
		output := buf.String()
		assert.Contains(t, output, "No clusters found.")
	})
	
	t.Run("handles single cluster", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		clusters := []ClusterDisplayInfo{
			{
				Name:      "single-cluster",
				Type:      "k3d",
				Status:    "pending",
				NodeCount: 1,
				CreatedAt: time.Date(2023, 6, 15, 10, 0, 0, 0, time.UTC),
			},
		}
		
		service.ShowClusterList(clusters, &buf)
		
		output := buf.String()
		assert.Contains(t, output, "single-cluster")
		assert.Contains(t, output, "pending")
		assert.Contains(t, output, "1")
	})
	
	t.Run("formats table headers correctly", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		clusters := []ClusterDisplayInfo{
			{
				Name:      "test",
				Type:      "k3d",
				Status:    "running",
				NodeCount: 2,
				CreatedAt: time.Now(),
			},
		}
		
		service.ShowClusterList(clusters, &buf)
		
		output := buf.String()
		lines := strings.Split(output, "\n")
		if len(lines) > 0 {
			headerLine := lines[0]
			assert.Contains(t, headerLine, "NAME")
			assert.Contains(t, headerLine, "TYPE")
			assert.Contains(t, headerLine, "STATUS")
			assert.Contains(t, headerLine, "NODES")
			assert.Contains(t, headerLine, "CREATED")
		}
	})
}

func TestDisplayService_ShowClusterStatus(t *testing.T) {
	t.Run("displays cluster status with all information", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		status := &ClusterDisplayInfo{
			Name:      "test-cluster",
			Type:      "k3d",
			Status:    "running",
			NodeCount: 3,
			CreatedAt: time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),
			Nodes: []NodeDisplayInfo{
				{Name: "node1", Role: "control-plane", Status: "ready"},
				{Name: "node2", Role: "worker", Status: "ready"},
				{Name: "node3", Role: "worker", Status: "ready"},
			},
		}
		
		service.ShowClusterStatus(status, &buf)
		
		output := buf.String()
		assert.Contains(t, output, "Cluster Status:")
		assert.Contains(t, output, "test-cluster")
		assert.Contains(t, output, "k3d")
		assert.Contains(t, output, "running")
		assert.Contains(t, output, "Node Count: 3")
		assert.Contains(t, output, "Created: 2023-01-01 12:00:00")
		assert.Contains(t, output, "Nodes:")
		assert.Contains(t, output, "node1 (control-plane):")
		assert.Contains(t, output, "node2 (worker):")
		assert.Contains(t, output, "node3 (worker):")
		assert.Contains(t, output, "ready")
	})
	
	t.Run("displays cluster status without nodes", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		status := &ClusterDisplayInfo{
			Name:      "simple-cluster",
			Type:      "gke",
			Status:    "pending",
			NodeCount: 0,
			CreatedAt: time.Date(2023, 5, 10, 8, 30, 0, 0, time.UTC),
			Nodes:     []NodeDisplayInfo{},
		}
		
		service.ShowClusterStatus(status, &buf)
		
		output := buf.String()
		assert.Contains(t, output, "simple-cluster")
		assert.Contains(t, output, "gke")
		assert.Contains(t, output, "pending")
		assert.Contains(t, output, "Node Count: 0")
		assert.NotContains(t, output, "Nodes:")
	})
	
	t.Run("handles different status values", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		status := &ClusterDisplayInfo{
			Name:      "error-cluster",
			Type:      "k3d",
			Status:    "error",
			NodeCount: 1,
			CreatedAt: time.Now(),
		}
		
		service.ShowClusterStatus(status, &buf)
		
		output := buf.String()
		assert.Contains(t, output, "error")
	})
}

func TestDisplayService_ShowConfigurationSummary(t *testing.T) {
	t.Run("displays configuration summary", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		config := &ClusterConfigDisplay{
			Name:       "test-cluster",
			Type:       "k3d",
			K8sVersion: "v1.25.0-k3s1",
			NodeCount:  3,
		}
		
		err := service.ShowConfigurationSummary(config, false, false, &buf)
		
		assert.NoError(t, err)
		output := buf.String()
		assert.Contains(t, output, "Configuration Summary:")
		assert.Contains(t, output, "Cluster Name: test-cluster")
		assert.Contains(t, output, "Cluster Type: k3d")
		assert.Contains(t, output, "Kubernetes Version: v1.25.0-k3s1")
		assert.Contains(t, output, "Node Count: 3")
	})
	
	t.Run("displays dry run mode message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		config := &ClusterConfigDisplay{
			Name:       "test-cluster",
			Type:       "k3d",
			K8sVersion: "v1.25.0-k3s1",
			NodeCount:  3,
		}
		
		err := service.ShowConfigurationSummary(config, true, false, &buf)
		
		assert.NoError(t, err)
		output := buf.String()
		assert.Contains(t, output, "DRY RUN MODE - No actual changes will be made")
	})
	
	t.Run("displays skip wizard message", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		config := &ClusterConfigDisplay{
			Name:       "test-cluster",
			Type:       "k3d",
			K8sVersion: "v1.25.0-k3s1",
			NodeCount:  3,
		}
		
		err := service.ShowConfigurationSummary(config, false, true, &buf)
		
		assert.NoError(t, err)
		output := buf.String()
		assert.Contains(t, output, "Proceeding with cluster creation...")
	})
	
	t.Run("handles empty configuration values", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		config := &ClusterConfigDisplay{
			Name:       "",
			Type:       "",
			K8sVersion: "",
			NodeCount:  0,
		}
		
		err := service.ShowConfigurationSummary(config, false, false, &buf)
		
		assert.NoError(t, err)
		output := buf.String()
		assert.Contains(t, output, "Cluster Name: ")
		assert.Contains(t, output, "Cluster Type: ")
		assert.Contains(t, output, "Node Count: 0")
	})
	
	t.Run("handles both dry run and skip wizard", func(t *testing.T) {
		service := NewDisplayService()
		var buf bytes.Buffer
		
		config := &ClusterConfigDisplay{
			Name:       "test-cluster",
			Type:       "k3d",
			K8sVersion: "v1.25.0-k3s1",
			NodeCount:  3,
		}
		
		err := service.ShowConfigurationSummary(config, true, true, &buf)
		
		assert.NoError(t, err)
		output := buf.String()
		// Dry run takes precedence
		assert.Contains(t, output, "DRY RUN MODE - No actual changes will be made")
		assert.NotContains(t, output, "Proceeding with cluster creation...")
	})
}

func TestClusterDisplayInfo(t *testing.T) {
	t.Run("creates cluster display info with all fields", func(t *testing.T) {
		createdAt := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)
		nodes := []NodeDisplayInfo{
			{Name: "node1", Role: "control-plane", Status: "ready"},
			{Name: "node2", Role: "worker", Status: "ready"},
		}
		
		info := ClusterDisplayInfo{
			Name:      "test-cluster",
			Type:      "k3d",
			Status:    "running",
			NodeCount: 2,
			CreatedAt: createdAt,
			Nodes:     nodes,
		}
		
		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, "k3d", info.Type)
		assert.Equal(t, "running", info.Status)
		assert.Equal(t, 2, info.NodeCount)
		assert.Equal(t, createdAt, info.CreatedAt)
		assert.Len(t, info.Nodes, 2)
		assert.Equal(t, "node1", info.Nodes[0].Name)
		assert.Equal(t, "control-plane", info.Nodes[0].Role)
		assert.Equal(t, "ready", info.Nodes[0].Status)
	})
}

func TestNodeDisplayInfo(t *testing.T) {
	t.Run("creates node display info", func(t *testing.T) {
		node := NodeDisplayInfo{
			Name:   "worker-node-1",
			Role:   "worker",
			Status: "ready",
		}
		
		assert.Equal(t, "worker-node-1", node.Name)
		assert.Equal(t, "worker", node.Role)
		assert.Equal(t, "ready", node.Status)
	})
}

func TestClusterConfigDisplay(t *testing.T) {
	t.Run("creates cluster config display", func(t *testing.T) {
		config := ClusterConfigDisplay{
			Name:       "my-cluster",
			Type:       "gke",
			K8sVersion: "v1.26.0",
			NodeCount:  5,
		}
		
		assert.Equal(t, "my-cluster", config.Name)
		assert.Equal(t, "gke", config.Type)
		assert.Equal(t, "v1.26.0", config.K8sVersion)
		assert.Equal(t, 5, config.NodeCount)
	})
}