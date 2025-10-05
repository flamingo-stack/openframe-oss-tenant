package ui

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSkaffoldUI(t *testing.T) {
	tests := []struct {
		name    string
		verbose bool
	}{
		{
			name:    "create with verbose false",
			verbose: false,
		},
		{
			name:    "create with verbose true",
			verbose: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ui := NewSkaffoldUI(tt.verbose)

			assert.NotNil(t, ui)
			assert.Equal(t, tt.verbose, ui.verbose)
		})
	}
}

func TestSkaffoldUI_findSkaffoldYamlFiles(t *testing.T) {
	// Create temporary directory structure for testing
	tmpDir := t.TempDir()

	// Create test directory structure
	openframeServices := filepath.Join(tmpDir, "openframe", "services")
	integratedTools := filepath.Join(tmpDir, "integrated-tools")
	clientDir := filepath.Join(tmpDir, "client")

	err := os.MkdirAll(filepath.Join(openframeServices, "openframe-api"), 0755)
	require.NoError(t, err)
	err = os.MkdirAll(filepath.Join(openframeServices, "openframe-gateway"), 0755)
	require.NoError(t, err)
	err = os.MkdirAll(filepath.Join(integratedTools, "authentik", "postgresql"), 0755)
	require.NoError(t, err)
	err = os.MkdirAll(filepath.Join(integratedTools, "fleetmdm"), 0755)
	require.NoError(t, err)
	err = os.MkdirAll(clientDir, 0755)
	require.NoError(t, err)

	// Create test skaffold.yaml files
	testFiles := []string{
		filepath.Join(openframeServices, "openframe-api", "skaffold.yaml"),
		filepath.Join(openframeServices, "openframe-gateway", "skaffold.yml"), // Test .yml extension too
		filepath.Join(integratedTools, "authentik", "postgresql", "skaffold.yaml"),
		filepath.Join(integratedTools, "fleetmdm", "skaffold.yaml"),
		filepath.Join(clientDir, "skaffold.yaml"),
	}

	for _, file := range testFiles {
		err = os.WriteFile(file, []byte("# Test skaffold file"), 0644)
		require.NoError(t, err)
	}

	// Create a non-skaffold file that should be ignored
	err = os.WriteFile(filepath.Join(openframeServices, "openframe-api", "docker-compose.yaml"), []byte("# Not skaffold"), 0644)
	require.NoError(t, err)

	ui := NewSkaffoldUI(false)

	// Change to temp directory to test relative paths
	originalDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(originalDir)

	err = os.Chdir(tmpDir)
	require.NoError(t, err)

	files := ui.findSkaffoldYamlFiles(".")

	// Should find 5 skaffold files
	assert.Len(t, files, 5)

	// Check that all files are correctly structured
	for _, file := range files {
		assert.NotEmpty(t, file.ServiceName)
		assert.NotEmpty(t, file.FilePath)
		assert.True(t, strings.Contains(file.FilePath, "skaffold.yaml") || strings.Contains(file.FilePath, "skaffold.yml"))
	}

	// Check service names are extracted correctly
	serviceNames := make(map[string]bool)
	for _, file := range files {
		serviceNames[file.ServiceName] = true
	}

	expectedServices := []string{"openframe-api", "openframe-gateway", "authentik-postgres", "fleetmdm-server"}
	for _, expected := range expectedServices {
		assert.True(t, serviceNames[expected], "Expected service %s not found", expected)
	}
}

func TestSkaffoldUI_extractServiceName(t *testing.T) {
	ui := NewSkaffoldUI(false)

	tests := []struct {
		name     string
		filePath string
		expected string
	}{
		{
			name:     "openframe service",
			filePath: "../openframe/services/openframe-api/skaffold.yaml",
			expected: "openframe-api",
		},
		{
			name:     "openframe service with yml extension",
			filePath: "../openframe/services/openframe-gateway/skaffold.yml",
			expected: "openframe-gateway",
		},
		{
			name:     "authentik postgres tool",
			filePath: "../integrated-tools/authentik/postgresql/skaffold.yaml",
			expected: "authentik-postgres",
		},
		{
			name:     "fleetmdm tool",
			filePath: "../integrated-tools/fleetmdm/skaffold.yaml",
			expected: "fleetmdm-server",
		},
		{
			name:     "meshcentral tool",
			filePath: "../integrated-tools/meshcentral/server/skaffold.yaml",
			expected: "meshcentral-server",
		},
		{
			name:     "tactical-rmm base",
			filePath: "../integrated-tools/tactical-rmm/tactical-base/skaffold.yaml",
			expected: "tactical-base",
		},
		{
			name:     "tactical-rmm frontend",
			filePath: "../integrated-tools/tactical-rmm/tactical-frontend/skaffold.yaml",
			expected: "tactical-frontend",
		},
		{
			name:     "tactical-rmm nginx",
			filePath: "../integrated-tools/tactical-rmm/tactical-nginx/skaffold.yaml",
			expected: "tactical-nginx",
		},
		{
			name:     "client service",
			filePath: "../client/skaffold.yaml",
			expected: "client",
		},
		{
			name:     "other service",
			filePath: "../other/service-name/skaffold.yaml",
			expected: "service-name",
		},
		{
			name:     "fallback case",
			filePath: "skaffold.yaml",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ui.extractServiceName(tt.filePath)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSkaffoldUI_categorizeSkaffoldFiles(t *testing.T) {
	ui := NewSkaffoldUI(false)

	files := []SkaffoldFile{
		{ServiceName: "openframe-api", FilePath: "../openframe/services/openframe-api/skaffold.yaml"},
		{ServiceName: "openframe-gateway", FilePath: "../openframe/services/openframe-gateway/skaffold.yaml"},
		{ServiceName: "authentik-postgres", FilePath: "../integrated-tools/authentik/postgresql/skaffold.yaml"},
		{ServiceName: "fleetmdm-server", FilePath: "../integrated-tools/fleetmdm/skaffold.yaml"},
		{ServiceName: "client", FilePath: "../client/skaffold.yaml"},
		{ServiceName: "other-service", FilePath: "../other/service/skaffold.yaml"},
	}

	categories := ui.categorizeSkaffoldFiles(files)

	// Should have 4 categories: openframe-services, integrated-tools, client, other
	assert.Len(t, categories, 4)

	// Check category order
	expectedOrder := []string{"OpenFrame Services", "Integrated Tools", "Client Applications", "Other Services"}
	for i, category := range categories {
		assert.Equal(t, expectedOrder[i], category.Name)
	}

	// Check OpenFrame Services category
	openframeCategory := categories[0]
	assert.Equal(t, "OpenFrame Services", openframeCategory.Name)
	assert.Equal(t, "🏗️ ", openframeCategory.Icon)
	assert.Len(t, openframeCategory.Files, 2)

	// Check service names are sorted
	assert.Equal(t, "openframe-api", openframeCategory.Files[0].ServiceName)
	assert.Equal(t, "openframe-gateway", openframeCategory.Files[1].ServiceName)

	// Check Integrated Tools category
	toolsCategory := categories[1]
	assert.Equal(t, "Integrated Tools", toolsCategory.Name)
	assert.Equal(t, "🔧 ", toolsCategory.Icon)
	assert.Len(t, toolsCategory.Files, 2)

	// Check Client Applications category
	clientCategory := categories[2]
	assert.Equal(t, "Client Applications", clientCategory.Name)
	assert.Equal(t, "💻 ", clientCategory.Icon)
	assert.Len(t, clientCategory.Files, 1)
	assert.Equal(t, "client", clientCategory.Files[0].ServiceName)

	// Check Other Services category
	otherCategory := categories[3]
	assert.Equal(t, "Other Services", otherCategory.Name)
	assert.Equal(t, "📦 ", otherCategory.Icon)
	assert.Len(t, otherCategory.Files, 1)
	assert.Equal(t, "other-service", otherCategory.Files[0].ServiceName)
}

func TestSkaffoldUI_categorizeSkaffoldFiles_EmptyInput(t *testing.T) {
	ui := NewSkaffoldUI(false)

	categories := ui.categorizeSkaffoldFiles([]SkaffoldFile{})

	assert.Empty(t, categories)
}

func TestSkaffoldUI_categorizeSkaffoldFiles_SingleCategory(t *testing.T) {
	ui := NewSkaffoldUI(false)

	files := []SkaffoldFile{
		{ServiceName: "openframe-api", FilePath: "../openframe/services/openframe-api/skaffold.yaml"},
		{ServiceName: "openframe-frontend", FilePath: "../openframe/services/openframe-frontend/skaffold.yaml"},
	}

	categories := ui.categorizeSkaffoldFiles(files)

	// Should have only 1 category
	assert.Len(t, categories, 1)
	assert.Equal(t, "OpenFrame Services", categories[0].Name)
	assert.Len(t, categories[0].Files, 2)

	// Should be sorted alphabetically
	assert.Equal(t, "openframe-api", categories[0].Files[0].ServiceName)
	assert.Equal(t, "openframe-frontend", categories[0].Files[1].ServiceName)
}

func TestSkaffoldFile_Structure(t *testing.T) {
	// Test that SkaffoldFile struct has the expected fields
	file := SkaffoldFile{
		ServiceName: "test-service",
		FilePath:    "/path/to/skaffold.yaml",
	}

	assert.Equal(t, "test-service", file.ServiceName)
	assert.Equal(t, "/path/to/skaffold.yaml", file.FilePath)
}

func TestSkaffoldCategory_Structure(t *testing.T) {
	// Test that SkaffoldCategory struct has the expected fields
	category := SkaffoldCategory{
		Name: "Test Category",
		Icon: "🧪 ",
		Files: []SkaffoldFile{
			{ServiceName: "service1", FilePath: "/path1"},
			{ServiceName: "service2", FilePath: "/path2"},
		},
	}

	assert.Equal(t, "Test Category", category.Name)
	assert.Equal(t, "🧪 ", category.Icon)
	assert.Len(t, category.Files, 2)
	assert.Equal(t, "service1", category.Files[0].ServiceName)
	assert.Equal(t, "service2", category.Files[1].ServiceName)
}

func TestErrNoSkaffoldFiles(t *testing.T) {
	// Test that the error variable is properly defined
	assert.NotNil(t, ErrNoSkaffoldFiles)
	assert.Equal(t, "no skaffold files found", ErrNoSkaffoldFiles.Error())
}

// Test edge cases and error conditions

func TestSkaffoldUI_findSkaffoldYamlFiles_NonExistentPath(t *testing.T) {
	ui := NewSkaffoldUI(false)

	files := ui.findSkaffoldYamlFiles("/non/existent/path")

	// Should return empty slice, not error
	assert.Empty(t, files)
}

func TestSkaffoldUI_findSkaffoldYamlFiles_VerboseMode(t *testing.T) {
	ui := NewSkaffoldUI(true) // verbose mode

	files := ui.findSkaffoldYamlFiles("/non/existent/path")

	// Should still return empty slice in verbose mode
	assert.Empty(t, files)
}

func TestSkaffoldUI_extractServiceName_EdgeCases(t *testing.T) {
	ui := NewSkaffoldUI(false)

	tests := []struct {
		name     string
		filePath string
		expected string
	}{
		{
			name:     "empty path",
			filePath: "",
			expected: "",
		},
		{
			name:     "just filename",
			filePath: "skaffold.yaml",
			expected: "",
		},
		{
			name:     "single directory",
			filePath: "service/skaffold.yaml",
			expected: "service",
		},
		{
			name:     "unknown integrated tool",
			filePath: "../integrated-tools/unknown-tool/skaffold.yaml",
			expected: "unknown-tool",
		},
		{
			name:     "nested integrated tool path",
			filePath: "../integrated-tools/unknown/deep/path/skaffold.yaml",
			expected: "path",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ui.extractServiceName(tt.filePath)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSkaffoldUI_categorizeSkaffoldFiles_Sorting(t *testing.T) {
	ui := NewSkaffoldUI(false)

	// Create files in non-alphabetical order
	files := []SkaffoldFile{
		{ServiceName: "openframe-frontend", FilePath: "../openframe/services/openframe-frontend/skaffold.yaml"},
		{ServiceName: "openframe-api", FilePath: "../openframe/services/openframe-api/skaffold.yaml"},
		{ServiceName: "openframe-gateway", FilePath: "../openframe/services/openframe-gateway/skaffold.yaml"},
	}

	categories := ui.categorizeSkaffoldFiles(files)

	// Should be sorted alphabetically within the category
	assert.Len(t, categories, 1)
	openframeFiles := categories[0].Files
	assert.Equal(t, "openframe-api", openframeFiles[0].ServiceName)
	assert.Equal(t, "openframe-frontend", openframeFiles[1].ServiceName)
	assert.Equal(t, "openframe-gateway", openframeFiles[2].ServiceName)
}
