package prerequisites

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewPrerequisiteChecker(t *testing.T) {
	checker := NewPrerequisiteChecker()
	
	assert.NotNil(t, checker)
	assert.Len(t, checker.requirements, 3)
	
	// Verify all expected tools are present
	toolNames := []string{}
	for _, req := range checker.requirements {
		toolNames = append(toolNames, req.Name)
	}
	
	assert.Contains(t, toolNames, "Telepresence")
	assert.Contains(t, toolNames, "jq")
	assert.Contains(t, toolNames, "Skaffold")
}

func TestPrerequisiteChecker_CheckAll(t *testing.T) {
	checker := NewPrerequisiteChecker()
	
	// This test checks the structure rather than actual installation
	// since we can't control what's installed on the test system
	allPresent, missing := checker.CheckAll()
	
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

func TestPrerequisiteChecker_GetInstallInstructions(t *testing.T) {
	checker := NewPrerequisiteChecker()
	
	tests := []struct {
		name         string
		missingTools []string
		expectCount  int
	}{
		{
			name:         "single tool",
			missingTools: []string{"Telepresence"},
			expectCount:  1,
		},
		{
			name:         "multiple tools",
			missingTools: []string{"Telepresence", "jq"},
			expectCount:  2,
		},
		{
			name:         "case insensitive",
			missingTools: []string{"telepresence", "JQ"},
			expectCount:  2,
		},
		{
			name:         "unknown tool",
			missingTools: []string{"unknown-tool"},
			expectCount:  0,
		},
		{
			name:         "empty list",
			missingTools: []string{},
			expectCount:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			instructions := checker.GetInstallInstructions(tt.missingTools)
			assert.Len(t, instructions, tt.expectCount)
			
			// Verify each instruction is non-empty
			for _, instruction := range instructions {
				assert.NotEmpty(t, instruction)
			}
		})
	}
}

func TestCheckPrerequisites(t *testing.T) {
	// Skip this test as it involves user interaction
	t.Skip("Skipping test that requires user interaction")
	
	// If we wanted to test this without interaction, we would need to mock
	// the installer or set up test mode properly
}

func TestRequirement_Structure(t *testing.T) {
	checker := NewPrerequisiteChecker()
	
	// Verify each requirement has all necessary fields
	for _, req := range checker.requirements {
		assert.NotEmpty(t, req.Name, "Requirement name should not be empty")
		assert.NotEmpty(t, req.Command, "Requirement command should not be empty")
		assert.NotNil(t, req.IsInstalled, "IsInstalled function should not be nil")
		assert.NotNil(t, req.InstallHelp, "InstallHelp function should not be nil")
		
		// Verify functions can be called without panicking
		assert.NotPanics(t, func() {
			_ = req.IsInstalled()
		}, "IsInstalled should not panic")
		
		assert.NotPanics(t, func() {
			help := req.InstallHelp()
			assert.NotEmpty(t, help, "InstallHelp should return non-empty string")
		}, "InstallHelp should not panic")
	}
}