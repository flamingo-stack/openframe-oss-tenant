package config

import (
	"testing"

	chartUI "github.com/flamingo-stack/openframe/openframe/internal/chart/ui"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewBuilder(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()

	builder := NewBuilder(operationsUI)

	assert.NotNil(t, builder)
	assert.NotNil(t, builder.configService)
	assert.NotNil(t, builder.operationsUI)
	assert.Equal(t, operationsUI, builder.operationsUI)
}

func TestNewBuilder_WithNilOperationsUI(t *testing.T) {
	builder := NewBuilder(nil)

	assert.NotNil(t, builder)
	assert.NotNil(t, builder.configService)
	assert.Nil(t, builder.operationsUI)
}

func TestBuilder_ImplementsConfigBuilderInterface(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	// Verify builder has expected methods (interface compatibility without import cycle)
	assert.NotNil(t, builder)

	// Test that BuildInstallConfig method exists and works
	config, err := builder.BuildInstallConfig(
		false, false, false,
		"test-cluster",
		"", "", "",
	)
	assert.NoError(t, err)
	assert.NotNil(t, config)
}

func TestBuilder_BuildInstallConfig_BasicConfiguration(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		false, false, false, // force, dryRun, verbose
		"test-cluster",
		"", "", "", // no GitHub config
	)

	assert.NoError(t, err)
	assert.Equal(t, "test-cluster", config.ClusterName)
	assert.False(t, config.Force)
	assert.False(t, config.DryRun)
	assert.False(t, config.Verbose)
	assert.False(t, config.Silent)
	assert.Nil(t, config.AppOfApps)
	assert.False(t, config.HasAppOfApps())
}

func TestBuilder_BuildInstallConfig_WithFlags(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		true, true, true, // force, dryRun, verbose
		"production-cluster",
		"", "", "", // no GitHub config
	)

	assert.NoError(t, err)
	assert.Equal(t, "production-cluster", config.ClusterName)
	assert.True(t, config.Force)
	assert.True(t, config.DryRun)
	assert.True(t, config.Verbose)
	assert.Nil(t, config.AppOfApps)
}

func TestBuilder_BuildInstallConfig_WithGitHubRepo(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		false, false, false,
		"test-cluster",
		"https://github.com/test/repo", "main", "",
	)

	assert.NoError(t, err)
	assert.Equal(t, "test-cluster", config.ClusterName)
	assert.NotNil(t, config.AppOfApps)
	assert.True(t, config.HasAppOfApps())

	// Verify app-of-apps configuration
	assert.Equal(t, "https://github.com/test/repo", config.AppOfApps.GitHubRepo)
	assert.Equal(t, "main", config.AppOfApps.GitHubBranch)

	// Should have default values from NewAppOfAppsConfig
	assert.Equal(t, "manifests/app-of-apps", config.AppOfApps.ChartPath)
	assert.Equal(t, "argocd", config.AppOfApps.Namespace)
	assert.Equal(t, "60m", config.AppOfApps.Timeout)
}

func TestBuilder_BuildInstallConfig_WithCustomCertDir(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		false, false, false,
		"test-cluster",
		"https://github.com/test/repo", "main", "/custom/cert/dir",
	)

	assert.NoError(t, err)
	assert.NotNil(t, config.AppOfApps)
	assert.Equal(t, "/custom/cert/dir", config.AppOfApps.CertDir)
}

func TestBuilder_BuildInstallConfig_WithoutCertDir(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		false, false, false,
		"test-cluster",
		"https://github.com/test/repo", "main", "", // empty cert dir
	)

	assert.NoError(t, err)
	assert.NotNil(t, config.AppOfApps)
	// Should use config service's default certificate directory
	assert.NotEmpty(t, config.AppOfApps.CertDir)
}

func TestBuilder_BuildInstallConfig_AllFlags(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		true, true, true, // all flags true
		"full-config-cluster",
		"https://github.com/full/config", "develop", "/full/cert/path",
	)

	assert.NoError(t, err)

	// Verify all basic flags
	assert.Equal(t, "full-config-cluster", config.ClusterName)
	assert.True(t, config.Force)
	assert.True(t, config.DryRun)
	assert.True(t, config.Verbose)

	// Verify app-of-apps configuration
	assert.NotNil(t, config.AppOfApps)
	assert.True(t, config.HasAppOfApps())
	assert.Equal(t, "https://github.com/full/config", config.AppOfApps.GitHubRepo)
	assert.Equal(t, "develop", config.AppOfApps.GitHubBranch)
	assert.Equal(t, "/full/cert/path", config.AppOfApps.CertDir)
}

func TestBuilder_BuildInstallConfig_EmptyClusterName(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		false, false, false,
		"", // empty cluster name
		"", "", "",
	)

	assert.NoError(t, err)
	assert.Empty(t, config.ClusterName)
	assert.Nil(t, config.AppOfApps)
}

func TestBuilder_BuildInstallConfig_CompleteGitHubCredentials(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	// Test with complete GitHub configuration
	config, err := builder.BuildInstallConfig(
		false, false, false,
		"test-cluster",
		"https://github.com/test/repo", "main", "",
	)

	assert.NoError(t, err)
	assert.NotNil(t, config.AppOfApps)
	assert.Equal(t, "https://github.com/test/repo", config.AppOfApps.GitHubRepo)
	assert.Equal(t, "main", config.AppOfApps.GitHubBranch)
}

func TestBuilder_BuildInstallConfig_PublicRepoWithCredentials(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	config, err := builder.BuildInstallConfig(
		false, false, false,
		"minimal-cluster",
		"https://github.com/minimal/repo", "feature-branch", "",
	)

	assert.NoError(t, err)
	assert.Equal(t, "minimal-cluster", config.ClusterName)
	assert.NotNil(t, config.AppOfApps)
	assert.True(t, config.HasAppOfApps())
	assert.Equal(t, "https://github.com/minimal/repo", config.AppOfApps.GitHubRepo)
	assert.Equal(t, "feature-branch", config.AppOfApps.GitHubBranch)
	assert.NotEmpty(t, config.AppOfApps.CertDir) // Should use default
}

func TestBuilder_BuildInstallConfig_DifferentBranches(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	branches := []string{"main", "develop", "feature/test", "release/v1.0", "hotfix/urgent"}

	for _, branch := range branches {
		config, err := builder.BuildInstallConfig(
			false, false, false,
			"branch-test-cluster",
			"https://github.com/test/branches", branch, "",
		)

		assert.NoError(t, err)
		assert.NotNil(t, config.AppOfApps)
		assert.Equal(t, branch, config.AppOfApps.GitHubBranch)
		assert.Equal(t, "https://github.com/test/branches", config.AppOfApps.GitHubRepo)
	}
}

func TestBuilder_ComponentsInitialized(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	// All components should be properly initialized
	require.NotNil(t, builder.configService)
	require.Equal(t, operationsUI, builder.operationsUI)
}

func TestBuilder_MultipleBuilds(t *testing.T) {
	operationsUI := chartUI.NewOperationsUI()
	builder := NewBuilder(operationsUI)

	// Build multiple configurations to ensure builder is stateless
	config1, err1 := builder.BuildInstallConfig(
		true, false, true,
		"cluster-1",
		"https://github.com/test/repo1", "main", "/path1",
	)

	config2, err2 := builder.BuildInstallConfig(
		false, true, false,
		"cluster-2",
		"https://github.com/test/repo2", "develop", "/path2",
	)

	assert.NoError(t, err1)
	assert.NoError(t, err2)

	// Verify configurations are independent
	assert.Equal(t, "cluster-1", config1.ClusterName)
	assert.Equal(t, "cluster-2", config2.ClusterName)

	assert.True(t, config1.Force)
	assert.False(t, config2.Force)

	assert.False(t, config1.DryRun)
	assert.True(t, config2.DryRun)

	assert.Equal(t, "https://github.com/test/repo1", config1.AppOfApps.GitHubRepo)
	assert.Equal(t, "https://github.com/test/repo2", config2.AppOfApps.GitHubRepo)
}
