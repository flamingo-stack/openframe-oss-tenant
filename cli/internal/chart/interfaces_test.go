package chart

import (
	"errors"
	"testing"

	clusterDomain "github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/stretchr/testify/assert"
)

// MockClusterLister implements ClusterLister interface for testing
type MockClusterLister struct {
	clusters []clusterDomain.ClusterInfo
	err      error
}

// ListClusters implements ClusterLister interface
func (m *MockClusterLister) ListClusters() ([]clusterDomain.ClusterInfo, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.clusters, nil
}

// NewMockClusterLister creates a new mock cluster lister
func NewMockClusterLister() *MockClusterLister {
	return &MockClusterLister{
		clusters: make([]clusterDomain.ClusterInfo, 0),
	}
}

// SetClusters sets the clusters to be returned by ListClusters
func (m *MockClusterLister) SetClusters(clusters []clusterDomain.ClusterInfo) {
	m.clusters = clusters
}

// SetError sets the error to be returned by ListClusters
func (m *MockClusterLister) SetError(err error) {
	m.err = err
}

func TestClusterLister_Interface(t *testing.T) {
	// Test that MockClusterLister implements ClusterLister interface
	var lister ClusterLister = NewMockClusterLister()
	assert.NotNil(t, lister)
	
	// Test that interface method exists and can be called
	clusters, err := lister.ListClusters()
	assert.NoError(t, err)
	assert.NotNil(t, clusters)
	assert.Len(t, clusters, 0) // Empty by default
}

func TestMockClusterLister_EmptyClusters(t *testing.T) {
	lister := NewMockClusterLister()
	
	clusters, err := lister.ListClusters()
	
	assert.NoError(t, err)
	assert.NotNil(t, clusters)
	assert.Len(t, clusters, 0)
}

func TestMockClusterLister_WithClusters(t *testing.T) {
	lister := NewMockClusterLister()
	expectedClusters := []clusterDomain.ClusterInfo{
		{
			Name:   "cluster-1",
			Status: "running",
		},
		{
			Name:   "cluster-2", 
			Status: "stopped",
		},
	}
	
	lister.SetClusters(expectedClusters)
	
	clusters, err := lister.ListClusters()
	
	assert.NoError(t, err)
	assert.Equal(t, expectedClusters, clusters)
	assert.Len(t, clusters, 2)
}

func TestMockClusterLister_WithError(t *testing.T) {
	lister := NewMockClusterLister()
	expectedError := errors.New("connection failed")
	
	lister.SetError(expectedError)
	
	clusters, err := lister.ListClusters()
	
	assert.Error(t, err)
	assert.Equal(t, expectedError, err)
	assert.Nil(t, clusters)
}

func TestMockClusterLister_SingleCluster(t *testing.T) {
	lister := NewMockClusterLister()
	expectedCluster := []clusterDomain.ClusterInfo{
		{
			Name:       "test-cluster",
			Status:     "running",
			NodeCount:  3,
			K8sVersion: "v1.28.0",
		},
	}
	
	lister.SetClusters(expectedCluster)
	
	clusters, err := lister.ListClusters()
	
	assert.NoError(t, err)
	assert.Len(t, clusters, 1)
	assert.Equal(t, "test-cluster", clusters[0].Name)
	assert.Equal(t, "running", clusters[0].Status)
	assert.Equal(t, 3, clusters[0].NodeCount)
	assert.Equal(t, "v1.28.0", clusters[0].K8sVersion)
}

func TestMockClusterLister_ResetBehavior(t *testing.T) {
	lister := NewMockClusterLister()
	
	// Set some clusters first
	lister.SetClusters([]clusterDomain.ClusterInfo{
		{Name: "cluster-1"},
	})
	
	clusters, err := lister.ListClusters()
	assert.NoError(t, err)
	assert.Len(t, clusters, 1)
	
	// Set error, should override clusters
	lister.SetError(errors.New("test error"))
	
	clusters, err = lister.ListClusters()
	assert.Error(t, err)
	assert.Nil(t, clusters)
	
	// Reset error, should return to clusters
	lister.SetError(nil)
	
	clusters, err = lister.ListClusters()
	assert.NoError(t, err)
	assert.Len(t, clusters, 1) // Original clusters still there
}

func TestMockClusterLister_OverrideClusters(t *testing.T) {
	lister := NewMockClusterLister()
	
	// Set initial clusters
	lister.SetClusters([]clusterDomain.ClusterInfo{
		{Name: "cluster-1"},
	})
	
	clusters, err := lister.ListClusters()
	assert.NoError(t, err)
	assert.Len(t, clusters, 1)
	assert.Equal(t, "cluster-1", clusters[0].Name)
	
	// Override with new clusters
	lister.SetClusters([]clusterDomain.ClusterInfo{
		{Name: "cluster-2"},
		{Name: "cluster-3"},
	})
	
	clusters, err = lister.ListClusters()
	assert.NoError(t, err)
	assert.Len(t, clusters, 2)
	assert.Equal(t, "cluster-2", clusters[0].Name)
	assert.Equal(t, "cluster-3", clusters[1].Name)
}

func TestClusterLister_InterfaceCompatibility(t *testing.T) {
	// Test that we can use ClusterLister interface polymorphically
	var lister ClusterLister
	
	// Can assign mock implementation
	lister = NewMockClusterLister()
	assert.NotNil(t, lister)
	
	// Can call interface methods
	clusters, err := lister.ListClusters()
	assert.NoError(t, err)
	assert.NotNil(t, clusters)
}

func TestClusterLister_InterfaceSignature(t *testing.T) {
	// Verify interface method signature expectations
	lister := NewMockClusterLister()
	
	// Method should return slice of ClusterInfo and error
	clusters, err := lister.ListClusters()
	
	// Verify return types
	assert.IsType(t, []clusterDomain.ClusterInfo{}, clusters)
	assert.IsType(t, (*error)(nil), &err)
}

func TestMockClusterLister_UsageInChartService(t *testing.T) {
	// Test that mock can be used in actual chart service context
	lister := NewMockClusterLister()
	lister.SetClusters([]clusterDomain.ClusterInfo{
		{
			Name:   "test-cluster",
			Status: "running",
		},
	})
	
	// This simulates how ChartService would use the interface
	validateCluster := func(clusterLister ClusterLister, clusterName string) error {
		clusters, err := clusterLister.ListClusters()
		if err != nil {
			return err
		}
		
		for _, cluster := range clusters {
			if cluster.Name == clusterName {
				return nil // Found
			}
		}
		return errors.New("cluster not found")
	}
	
	// Test successful validation
	err := validateCluster(lister, "test-cluster")
	assert.NoError(t, err)
	
	// Test cluster not found
	err = validateCluster(lister, "missing-cluster")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cluster not found")
	
	// Test error from lister
	lister.SetError(errors.New("connection error"))
	err = validateCluster(lister, "test-cluster")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "connection error")
}