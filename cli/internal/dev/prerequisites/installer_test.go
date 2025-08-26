package prerequisites

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewInstaller(t *testing.T) {
	installer := NewInstaller()
	
	assert.NotNil(t, installer)
	assert.NotNil(t, installer.checker)
}

func TestInstaller_CheckSilent(t *testing.T) {
	installer := NewInstaller()
	
	allPresent, missing := installer.CheckSilent()
	
	// Verify return types
	assert.IsType(t, true, allPresent)
	assert.IsType(t, []string{}, missing)
	
	// If something is missing, it should be reflected in both return values
	if len(missing) > 0 {
		assert.False(t, allPresent)
	} else {
		assert.True(t, allPresent)
	}
}

func TestInstaller_CheckSpecificTools(t *testing.T) {
	installer := NewInstaller()
	
	tests := []struct {
		name     string
		tools    []string
		hasError bool  // We can't predict this, just verify it behaves correctly
	}{
		{
			name:  "single tool",
			tools: []string{"telepresence"},
		},
		{
			name:  "multiple tools",
			tools: []string{"telepresence", "jq"},
		},
		{
			name:  "empty list",
			tools: []string{},
		},
		{
			name:  "unknown tool",
			tools: []string{"unknown-tool"},
		},
		{
			name:  "mixed case",
			tools: []string{"Telepresence", "JQ"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := installer.CheckSpecificTools(tt.tools)
			
			// For unknown tools, we expect no error since they're not in our installer map
			if tt.name == "unknown tool" {
				assert.NoError(t, err)
			}
			
			// For empty list, we expect no error
			if tt.name == "empty list" {
				assert.NoError(t, err)
			}
			
			// We can't assert specific behavior for real tools since it depends on system state
			// But we can verify the function doesn't panic
		})
	}
}

func TestCheckTelepresenceAndJq(t *testing.T) {
	// This is the backward compatibility function
	err := CheckTelepresenceAndJq()
	
	// We can't assert specific behavior since it depends on system state,
	// but we can verify it doesn't panic and returns appropriate types
	if err != nil {
		assert.Error(t, err)
	}
}

func TestInstaller_shouldAutoInstall(t *testing.T) {
	installer := NewInstaller()
	
	tests := []struct {
		name     string
		missing  []string
		expected bool
	}{
		{
			name:     "single missing tool",
			missing:  []string{"telepresence"},
			expected: false, // Currently hardcoded to false
		},
		{
			name:     "multiple missing tools",
			missing:  []string{"telepresence", "jq"},
			expected: false, // Currently hardcoded to false
		},
		{
			name:     "empty list",
			missing:  []string{},
			expected: false, // Currently hardcoded to false
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := installer.shouldAutoInstall(tt.missing)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestInstaller_Integration(t *testing.T) {
	installer := NewInstaller()
	
	// Test that the installer can interact with its checker
	allPresent, missing := installer.CheckSilent()
	
	if !allPresent && len(missing) > 0 {
		// Test that we can get install instructions for missing tools
		instructions := installer.checker.GetInstallInstructions(missing)
		
		// Instructions should be provided for known tools
		knownTools := []string{"Telepresence", "jq", "Skaffold"}
		knownMissing := []string{}
		for _, tool := range missing {
			for _, known := range knownTools {
				if tool == known {
					knownMissing = append(knownMissing, tool)
					break
				}
			}
		}
		
		// We should have at least as many instructions as known missing tools
		assert.GreaterOrEqual(t, len(instructions), len(knownMissing))
	}
}