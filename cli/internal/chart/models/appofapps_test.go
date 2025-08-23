package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewAppOfAppsConfig(t *testing.T) {
	config := NewAppOfAppsConfig()

	assert.NotNil(t, config)
	assert.Equal(t, "https://github.com/Flamingo-CX/openframe", config.GitHubRepo)
	assert.Equal(t, "main", config.GitHubBranch)
	assert.Equal(t, "manifests/app-of-apps", config.ChartPath)
	assert.Equal(t, "argocd", config.Namespace)
	assert.Equal(t, "60m", config.Timeout)
	assert.Empty(t, config.GitHubUsername)
	assert.Empty(t, config.GitHubToken)
	assert.Empty(t, config.CertDir)
	assert.Empty(t, config.ValuesFile)
}

func TestAppOfAppsConfig_GetGitURL(t *testing.T) {
	config := &AppOfAppsConfig{
		GitHubRepo:   "https://github.com/test/repo",
		GitHubBranch: "develop",
		ChartPath:    "charts/app-of-apps",
	}

	gitURL := config.GetGitURL()
	expected := "git+https://github.com/test/repo@charts/app-of-apps?ref=develop"
	assert.Equal(t, expected, gitURL)
}

func TestAppOfAppsConfig_GetGitURL_WithGitSuffix(t *testing.T) {
	config := &AppOfAppsConfig{
		GitHubRepo:   "https://github.com/test/repo.git",
		GitHubBranch: "main",
		ChartPath:    "manifests",
	}

	gitURL := config.GetGitURL()
	expected := "git+https://github.com/test/repo@manifests?ref=main"
	assert.Equal(t, expected, gitURL)
}

func TestAppOfAppsConfig_GetGitCredentials(t *testing.T) {
	// Test with no credentials
	config := &AppOfAppsConfig{}
	username, token := config.GetGitCredentials()
	assert.Empty(t, username)
	assert.Empty(t, token)

	// Test with partial credentials (only username)
	config.GitHubUsername = "testuser"
	username, token = config.GetGitCredentials()
	assert.Empty(t, username)
	assert.Empty(t, token)

	// Test with partial credentials (only token)
	config.GitHubUsername = ""
	config.GitHubToken = "token123"
	username, token = config.GetGitCredentials()
	assert.Empty(t, username)
	assert.Empty(t, token)

	// Test with complete credentials
	config.GitHubUsername = "testuser"
	config.GitHubToken = "token123"
	username, token = config.GetGitCredentials()
	assert.Equal(t, "testuser", username)
	assert.Equal(t, "token123", token)
}

func TestAppOfAppsConfig_IsPrivateRepo(t *testing.T) {
	config := &AppOfAppsConfig{}

	// Test with no credentials
	assert.False(t, config.IsPrivateRepo())

	// Test with only username
	config.GitHubUsername = "testuser"
	assert.False(t, config.IsPrivateRepo())

	// Test with only token
	config.GitHubUsername = ""
	config.GitHubToken = "token123"
	assert.False(t, config.IsPrivateRepo())

	// Test with both credentials
	config.GitHubUsername = "testuser"
	config.GitHubToken = "token123"
	assert.True(t, config.IsPrivateRepo())
}

func TestAppOfAppsConfig_CompleteConfiguration(t *testing.T) {
	config := &AppOfAppsConfig{
		GitHubRepo:     "https://github.com/test/private-repo",
		GitHubBranch:   "feature/new-charts",
		ChartPath:      "helm/charts/app-of-apps",
		GitHubUsername: "bot-user",
		GitHubToken:    "ghp_1234567890abcdef",
		CertDir:        "/etc/ssl/certs",
		ValuesFile:     "values.yaml",
		Namespace:      "openframe",
		Timeout:        "90m",
	}

	// Test all methods with complete configuration
	assert.True(t, config.IsPrivateRepo())
	
	username, token := config.GetGitCredentials()
	assert.Equal(t, "bot-user", username)
	assert.Equal(t, "ghp_1234567890abcdef", token)
	
	gitURL := config.GetGitURL()
	expected := "git+https://github.com/test/private-repo@helm/charts/app-of-apps?ref=feature/new-charts"
	assert.Equal(t, expected, gitURL)
	
	assert.Equal(t, "https://github.com/test/private-repo", config.GitHubRepo)
	assert.Equal(t, "feature/new-charts", config.GitHubBranch)
	assert.Equal(t, "helm/charts/app-of-apps", config.ChartPath)
	assert.Equal(t, "/etc/ssl/certs", config.CertDir)
	assert.Equal(t, "values.yaml", config.ValuesFile)
	assert.Equal(t, "openframe", config.Namespace)
	assert.Equal(t, "90m", config.Timeout)
}