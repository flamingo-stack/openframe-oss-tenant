package services

import (
	"errors"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	clusterDomain "github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
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

func TestNewChartService(t *testing.T) {
	service := NewChartService(false, false)

	assert.NotNil(t, service)
	assert.NotNil(t, service.executor)
	assert.NotNil(t, service.clusterService)
	assert.NotNil(t, service.configService)
	assert.NotNil(t, service.operationsUI)
	assert.NotNil(t, service.displayService)
	assert.NotNil(t, service.helmManager)
	assert.NotNil(t, service.gitRepository)
}

func TestNewChartService_WithDryRun(t *testing.T) {
	service := NewChartService(true, false)

	assert.NotNil(t, service)
	assert.NotNil(t, service.executor)
	assert.NotNil(t, service.clusterService)
}

func TestNewChartService_WithVerbose(t *testing.T) {
	service := NewChartService(false, true)

	assert.NotNil(t, service)
	assert.NotNil(t, service.executor)
	assert.NotNil(t, service.clusterService)
}

func TestInstallationWorkflow_Creation(t *testing.T) {
	service := NewChartService(false, false)
	clusterService := NewMockClusterLister()

	workflow := &InstallationWorkflow{
		chartService:   service,
		clusterService: clusterService,
	}

	assert.NotNil(t, workflow)
	assert.Equal(t, service, workflow.chartService)
	assert.Equal(t, clusterService, workflow.clusterService)
}

// Test MockClusterLister functionality
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

func TestMockClusterLister_InterfaceCompatibility(t *testing.T) {
	// Test that MockClusterLister implements ClusterLister interface
	var lister types.ClusterLister = NewMockClusterLister()
	assert.NotNil(t, lister)

	// Test that interface method exists and can be called
	clusters, err := lister.ListClusters()
	assert.NoError(t, err)
	assert.NotNil(t, clusters)
	assert.Len(t, clusters, 0) // Empty by default
}

func TestInstallationWorkflow_ValidateRequest(t *testing.T) {
	// Test basic request validation
	req := types.InstallationRequest{
		Args:         []string{"test-cluster"},
		Force:        false,
		DryRun:       false,
		Verbose:      false,
		GitHubRepo:   "https://github.com/test/repo",
		GitHubBranch: "main",
	}

	assert.Equal(t, "test-cluster", req.Args[0])
	assert.Equal(t, "https://github.com/test/repo", req.GitHubRepo)
	assert.Equal(t, "main", req.GitHubBranch)
	assert.False(t, req.Force)
	assert.False(t, req.DryRun)
	assert.False(t, req.Verbose)
}

func TestInstallationWorkflow_EmptyRequest(t *testing.T) {
	req := types.InstallationRequest{}

	assert.Empty(t, req.Args)
	assert.Empty(t, req.GitHubRepo)
	assert.Empty(t, req.GitHubBranch)
	assert.False(t, req.Force)
	assert.False(t, req.DryRun)
	assert.False(t, req.Verbose)
}
