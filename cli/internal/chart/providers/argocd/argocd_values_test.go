package argocd

import (
	"strings"
	"testing"
)

func TestGetArgoCDValues(t *testing.T) {
	values := GetArgoCDValues()

	// Test that the function returns non-empty string
	if values == "" {
		t.Error("GetArgoCDValues() returned empty string")
	}

	// Test that it contains expected YAML content
	expectedContent := []string{
		"fullnameOverride: argocd",
		"configs:",
		"resource.customizations.health.argoproj.io_Application:",
		"hs.status = \"Progressing\"",
	}

	for _, expected := range expectedContent {
		if !strings.Contains(values, expected) {
			t.Errorf("GetArgoCDValues() missing expected content: %s", expected)
		}
	}

	// Test that it's valid YAML format (starts with valid YAML)
	if !strings.Contains(values, "fullnameOverride:") {
		t.Error("GetArgoCDValues() does not appear to be valid YAML format")
	}
}

func TestGetArgoCDValuesStructure(t *testing.T) {
	values := GetArgoCDValues()
	
	// Count lines to ensure we have the expected structure
	lines := strings.Split(values, "\n")
	if len(lines) < 20 {
		t.Errorf("GetArgoCDValues() returned too few lines: got %d, want at least 20", len(lines))
	}

	// Check for health check script presence
	if !strings.Contains(values, "if obj.status ~= nil then") {
		t.Error("GetArgoCDValues() missing Lua health check script")
	}
}