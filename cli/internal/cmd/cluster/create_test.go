package cluster

import (
	"bytes"
	"context"
	"fmt"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/stretchr/testify/assert"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/stretchr/testify/mock"
)

func init() {
	// Suppress logo output during tests
	common.TestMode = true
}
// Mock cluster provider for testing
type MockClusterProvider struct {
	mock.Mock
}

func (m *MockClusterProvider) Create(ctx context.Context, config *cluster.ClusterConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

func (m *MockClusterProvider) Delete(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

func (m *MockClusterProvider) List(ctx context.Context) ([]*cluster.ClusterInfo, error) {
	args := m.Called(ctx)
	return args.Get(0).([]*cluster.ClusterInfo), args.Error(1)
}

func (m *MockClusterProvider) GetKubeconfig(ctx context.Context, name string) (string, error) {
	args := m.Called(ctx, name)
	return args.String(0), args.Error(1)
}

func (m *MockClusterProvider) Status(ctx context.Context, name string) (*cluster.ClusterInfo, error) {
	args := m.Called(ctx, name)
	return args.Get(0).(*cluster.ClusterInfo), args.Error(1)
}

func (m *MockClusterProvider) IsAvailable() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockClusterProvider) GetSupportedVersions() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

// Mock cluster manager for testing
type MockClusterManager struct {
	providers map[cluster.ClusterType]cluster.ClusterProvider
}

func NewMockClusterManager() *MockClusterManager {
	return &MockClusterManager{
		providers: make(map[cluster.ClusterType]cluster.ClusterProvider),
	}
}

func (m *MockClusterManager) RegisterProvider(clusterType cluster.ClusterType, provider cluster.ClusterProvider) {
	m.providers[clusterType] = provider
}

func (m *MockClusterManager) GetProvider(clusterType cluster.ClusterType) (cluster.ClusterProvider, error) {
	if provider, exists := m.providers[clusterType]; exists {
		return provider, nil
	}
	return nil, fmt.Errorf("provider not found for type: %s", clusterType)
}

func TestGetClusterName(t *testing.T) {
	tests := []struct {
		name     string
		args     []string
		expected string
	}{
		{
			name:     "with cluster name provided",
			args:     []string{"my-cluster"},
			expected: "my-cluster",
		},
		{
			name:     "no cluster name provided",
			args:     []string{},
			expected: "openframe-dev",
		},
		{
			name:     "empty args",
			args:     nil,
			expected: "openframe-dev",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := uiCluster.GetClusterNameOrDefault(tt.args, "openframe-dev")
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestParseClusterType(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected cluster.ClusterType
	}{
		{
			name:     "k3d type",
			input:    "k3d",
			expected: cluster.ClusterTypeK3d,
		},
		{
			name:     "empty string defaults to k3d",
			input:    "",
			expected: cluster.ClusterTypeK3d,
		},
		{
			name:     "unknown type defaults to k3d",
			input:    "unknown",
			expected: cluster.ClusterTypeK3d,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseClusterType(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetNodeCount(t *testing.T) {
	tests := []struct {
		name     string
		input    int
		expected int
	}{
		{
			name:     "valid node count",
			input:    5,
			expected: 5,
		},
		{
			name:     "zero defaults to 3",
			input:    0,
			expected: 3,
		},
		{
			name:     "negative defaults to 3",
			input:    -1,
			expected: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getNodeCount(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestValidateConfig(t *testing.T) {
	tests := []struct {
		name      string
		config    *cluster.ClusterConfig
		expectErr bool
	}{
		{
			name: "valid config",
			config: &cluster.ClusterConfig{
				Name:      "test-cluster",
				Type:      cluster.ClusterTypeK3d,
				NodeCount: 3,
			},
			expectErr: false,
		},
		{
			name: "empty name",
			config: &cluster.ClusterConfig{
				Name:      "",
				Type:      cluster.ClusterTypeK3d,
				NodeCount: 3,
			},
			expectErr: true,
		},
		{
			name: "zero node count gets defaulted",
			config: &cluster.ClusterConfig{
				Name:      "test-cluster",
				Type:      cluster.ClusterTypeK3d,
				NodeCount: 0,
			},
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateConfig(tt.config)
			if tt.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.config.NodeCount == 0 {
					assert.Equal(t, 3, tt.config.NodeCount) // Should be defaulted
				}
			}
		})
	}
}

func TestShowConfigSummary(t *testing.T) {
	config := &cluster.ClusterConfig{
		Name:       "test-cluster",
		Type:       cluster.ClusterTypeK3d,
		K8sVersion: "v1.33.0-k3s1",
		NodeCount:  3,
	}

	tests := []struct {
		name        string
		dryRun      bool
		skipWizard  bool
		expectError bool
	}{
		{
			name:        "dry run mode",
			dryRun:      true,
			skipWizard:  false,
			expectError: false,
		},
		{
			name:        "skip wizard mode",
			dryRun:      false,
			skipWizard:  true,
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var out bytes.Buffer
			err := showConfigSummary(config, tt.dryRun, tt.skipWizard, &out)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			output := out.String()
			assert.Contains(t, output, "Configuration Summary:")
			assert.Contains(t, output, "test-cluster")
			assert.Contains(t, output, "k3d")
			assert.Contains(t, output, "v1.33.0-k3s1")
			assert.Contains(t, output, "3")

			if tt.dryRun {
				assert.Contains(t, output, "DRY RUN MODE")
			}
			if tt.skipWizard {
				assert.Contains(t, output, "Proceeding with cluster creation")
			}
		})
	}
}

func TestCreateCommandFlags(t *testing.T) {
	// Reset global flags before test
	ResetGlobalFlags()

	cmd := getCreateCmd()
	
	// Test that all expected flags are present
	assert.NotNil(t, cmd.Flags().Lookup("type"))
	assert.NotNil(t, cmd.Flags().Lookup("nodes"))
	assert.NotNil(t, cmd.Flags().Lookup("version"))
	assert.NotNil(t, cmd.Flags().Lookup("skip-wizard"))
	assert.NotNil(t, cmd.Flags().Lookup("dry-run"))

	// Test flag aliases (shorthand flags return the main flag)
	typeFlag := cmd.Flags().Lookup("type")
	assert.NotNil(t, typeFlag)
	assert.Equal(t, "t", typeFlag.Shorthand)
	
	nodesFlag := cmd.Flags().Lookup("nodes")
	assert.NotNil(t, nodesFlag)
	assert.Equal(t, "n", nodesFlag.Shorthand)
	
	versionFlag := cmd.Flags().Lookup("version")
	assert.NotNil(t, versionFlag)
	assert.Equal(t, "v", versionFlag.Shorthand)
}

func TestRunCreateCluster_DryRun(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()

	// Create command with output buffer
	cmd := getCreateCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)

	// Set command flags directly
	cmd.Flags().Set("type", "k3d")
	cmd.Flags().Set("nodes", "2")
	cmd.Flags().Set("version", "v1.33.0-k3s1")
	cmd.Flags().Set("skip-wizard", "true")
	cmd.Flags().Set("dry-run", "true")

	// Run the command
	err := runCreateCluster(cmd, []string{"test-cluster"})
	assert.NoError(t, err)

	// Verify output
	output := out.String()
	assert.Contains(t, output, "Configuration Summary:")
	assert.Contains(t, output, "test-cluster")
	assert.Contains(t, output, "k3d")
	assert.Contains(t, output, "v1.33.0-k3s1")
	assert.Contains(t, output, "2")
	assert.Contains(t, output, "DRY RUN MODE")
}

func TestRunCreateCluster_ValidationError(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()

	cmd := getCreateCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)

	// Set command flags directly
	cmd.Flags().Set("skip-wizard", "true")
	cmd.Flags().Set("dry-run", "true")

	// Test with manually setting empty name in config to trigger validation
	// Since GetClusterNameOrDefault has default behavior, we need to test validation differently
	config := &cluster.ClusterConfig{
		Name:       "", // This should trigger validation error
		Type:       cluster.ClusterTypeK3d,
		NodeCount:  3,
		K8sVersion: "latest",
	}
	
	err := validateConfig(config)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cluster name cannot be empty")
}

func TestCreateCommandUsage(t *testing.T) {
	cmd := getCreateCmd()
	
	// Test basic command properties
	assert.Equal(t, "create [NAME]", cmd.Use)
	assert.Equal(t, "Create a new Kubernetes cluster", cmd.Short)
	assert.Contains(t, cmd.Long, "Create a new Kubernetes cluster with default OpenFrame configuration")
	
	// Test that the command has the correct args function
	assert.NotNil(t, cmd.Args)
}

func TestCreateCommand_HelpOutput(t *testing.T) {
	cmd := getCreateCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Trigger help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	
	// Help should not return an error
	assert.NoError(t, err)
	
	output := out.String()
	assert.Contains(t, output, "Create a new Kubernetes cluster")
	assert.Contains(t, output, "--type")
	assert.Contains(t, output, "--nodes")
	assert.Contains(t, output, "--skip-wizard")
	assert.Contains(t, output, "--dry-run")
}

// Integration test for the complete create flow (mocked)
func TestCreateCommand_Integration(t *testing.T) {
	// This test would require mocking the cluster manager
	// For now, we'll test the command structure and flag parsing
	
	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		contains []string
	}{
		{
			name:     "help flag",
			args:     []string{"--help"},
			wantErr:  false,
			contains: []string{"Create a new Kubernetes cluster"},
		},
		{
			name:     "invalid flag",
			args:     []string{"--invalid-flag"},
			wantErr:  true,
			contains: []string{"unknown flag"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := getCreateCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			err := cmd.Execute()
			
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			
			output := out.String()
			for _, contains := range tt.contains {
				assert.Contains(t, output, contains)
			}
		})
	}
}

// Test edge cases and error conditions
func TestCreateCommand_EdgeCases(t *testing.T) {
	t.Run("maximum args validation", func(t *testing.T) {
		cmd := getCreateCmd()
		
		// Should accept 0 args
		err := cmd.Args(cmd, []string{})
		assert.NoError(t, err)
		
		// Should accept 1 arg
		err = cmd.Args(cmd, []string{"cluster-name"})
		assert.NoError(t, err)
		
		// Should reject 2+ args
		err = cmd.Args(cmd, []string{"cluster-name", "extra-arg"})
		assert.Error(t, err)
	})
}

// Benchmark for command creation
func BenchmarkGetCreateCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getCreateCmd()
	}
}

// Test flag default values
func TestCreateCommand_FlagDefaults(t *testing.T) {
	cmd := getCreateCmd()
	
	// Get flag values to test defaults
	typeFlag := cmd.Flags().Lookup("type")
	nodesFlag := cmd.Flags().Lookup("nodes")
	versionFlag := cmd.Flags().Lookup("version")
	skipWizardFlag := cmd.Flags().Lookup("skip-wizard")
	dryRunFlag := cmd.Flags().Lookup("dry-run")
	
	assert.Equal(t, "", typeFlag.DefValue)
	assert.Equal(t, "3", nodesFlag.DefValue)
	assert.Equal(t, "", versionFlag.DefValue)
	assert.Equal(t, "false", skipWizardFlag.DefValue)
	assert.Equal(t, "false", dryRunFlag.DefValue)
}