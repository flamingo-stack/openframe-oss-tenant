package interfaces

import (
	"context"
	"fmt"

	"github.com/flamingo/openframe-cli/internal/cluster"
)

// MockProvider implements the ClusterProvider interface for testing
// It simulates cluster operations without executing external commands
type MockProvider struct {
	clusters    map[string]cluster.ClusterInfo
	shouldFail  bool
	failMessage string
}

// NewMockProvider creates a new mock cluster provider
func NewMockProvider() *MockProvider {
	return &MockProvider{
		clusters: make(map[string]cluster.ClusterInfo),
	}
}

// SetShouldFail configures the mock to fail operations
func (m *MockProvider) SetShouldFail(fail bool, message string) {
	m.shouldFail = fail
	m.failMessage = message
}

// AddCluster adds a mock cluster to the provider's state
func (m *MockProvider) AddCluster(name string, clusterType cluster.ClusterType) {
	m.clusters[name] = cluster.ClusterInfo{
		Name:       name,
		Type:       clusterType,
		Status:     "Running",
		NodeCount:  3,
		K8sVersion: "v1.28.0",
	}
}

// Create simulates cluster creation
func (m *MockProvider) Create(ctx context.Context, config cluster.ClusterConfig) error {
	if m.shouldFail {
		return fmt.Errorf("mock create failure: %s", m.failMessage)
	}
	
	m.clusters[config.Name] = cluster.ClusterInfo{
		Name:       config.Name,
		Type:       config.Type,
		Status:     "Running",
		NodeCount:  config.NodeCount,
		K8sVersion: config.K8sVersion,
	}
	
	return nil
}

// Delete simulates cluster deletion
func (m *MockProvider) Delete(ctx context.Context, name string, force bool) error {
	if m.shouldFail {
		return fmt.Errorf("mock delete failure: %s", m.failMessage)
	}
	
	if _, exists := m.clusters[name]; !exists {
		return fmt.Errorf("cluster '%s' not found", name)
	}
	
	delete(m.clusters, name)
	return nil
}

// Start simulates starting a cluster
func (m *MockProvider) Start(ctx context.Context, name string) error {
	if m.shouldFail {
		return fmt.Errorf("mock start failure: %s", m.failMessage)
	}
	
	clusterInfo, exists := m.clusters[name]
	if !exists {
		return fmt.Errorf("cluster '%s' not found", name)
	}
	
	clusterInfo.Status = "Running"
	m.clusters[name] = clusterInfo
	return nil
}

// List simulates listing clusters
func (m *MockProvider) List(ctx context.Context) ([]cluster.ClusterInfo, error) {
	if m.shouldFail {
		return nil, fmt.Errorf("mock list failure: %s", m.failMessage)
	}
	
	var clusters []cluster.ClusterInfo
	for _, clusterInfo := range m.clusters {
		clusters = append(clusters, clusterInfo)
	}
	
	return clusters, nil
}

// Status simulates getting cluster status
func (m *MockProvider) Status(ctx context.Context, name string) (cluster.ClusterInfo, error) {
	if m.shouldFail {
		return cluster.ClusterInfo{}, fmt.Errorf("mock status failure: %s", m.failMessage)
	}
	
	clusterInfo, exists := m.clusters[name]
	if !exists {
		return cluster.ClusterInfo{}, fmt.Errorf("cluster '%s' not found", name)
	}
	
	return clusterInfo, nil
}

// DetectType simulates detecting cluster type
func (m *MockProvider) DetectType(ctx context.Context, name string) (cluster.ClusterType, error) {
	if m.shouldFail {
		return "", fmt.Errorf("mock detect failure: %s", m.failMessage)
	}
	
	clusterInfo, exists := m.clusters[name]
	if !exists {
		return "", fmt.Errorf("cluster '%s' not found", name)
	}
	
	return clusterInfo.Type, nil
}

// GetKubeconfig simulates getting kubeconfig
func (m *MockProvider) GetKubeconfig(ctx context.Context, name string) (string, error) {
	if m.shouldFail {
		return "", fmt.Errorf("mock kubeconfig failure: %s", m.failMessage)
	}
	
	if _, exists := m.clusters[name]; !exists {
		return "", fmt.Errorf("cluster '%s' not found", name)
	}
	
	return fmt.Sprintf("mock-kubeconfig-for-%s", name), nil
}

// CreateMockManager creates a K3D cluster manager with mock executor for testing
func CreateMockManager() *cluster.K3dManager {
	// This function needs to use utils.CommandExecutor, not interfaces.CommandExecutor
	// For now, this is deprecated in favor of the test utilities
	panic("CreateMockManager is deprecated - use testutil.CreateStandardTestFlags() instead")
}