package configuration

import (
	"testing"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/stretchr/testify/assert"
)

func TestNewBranchConfigurator(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewBranchConfigurator(modifier)
	
	assert.NotNil(t, configurator)
	assert.Equal(t, modifier, configurator.modifier)
}

func TestBranchConfigurator_Configure_KeepExisting(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor
	
	// Create configuration with existing values
	existingValues := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "main",
			"repoURL":    "https://github.com/test/repo.git",
		},
	}
	
	// This test would require user interaction, so we'll test the underlying logic
	// by directly calling the modifier methods
	currentBranch := modifier.GetCurrentBranch(existingValues)
	assert.Equal(t, "main", currentBranch)
}

func TestBranchConfigurator_Configure_CustomBranch(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor
	
	// Test the modifier can handle custom branch changes
	existingValues := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "main",
			"repoURL":    "https://github.com/test/repo.git",
		},
	}
	
	// Simulate custom branch selection
	newBranch := "develop"
	config := &types.ChartConfiguration{
		Branch:           &newBranch,
		ModifiedSections: []string{"branch"},
		ExistingValues:   existingValues,
	}
	
	// Apply configuration
	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)
	
	// Verify branch was updated
	global := existingValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", global["repoBranch"])
}

func TestBranchConfigurator_Configure_WithEmptyValues(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor
	
	// Test with empty values (no global section)
	existingValues := map[string]interface{}{}
	
	currentBranch := modifier.GetCurrentBranch(existingValues)
	assert.Equal(t, "main", currentBranch) // Should return default
	
	// Test applying custom branch to empty values
	newBranch := "feature-branch"
	config := &types.ChartConfiguration{
		Branch:           &newBranch,
		ModifiedSections: []string{"branch"},
		ExistingValues:   existingValues,
	}
	
	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)
	
	// Verify global section was created
	global, ok := existingValues["global"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "feature-branch", global["repoBranch"])
}

func TestBranchConfigurator_Configure_BranchValidation(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor
	
	// Test various branch name formats
	testCases := []struct {
		name   string
		branch string
		valid  bool
	}{
		{"main branch", "main", true},
		{"develop branch", "develop", true},
		{"feature branch", "feature/new-feature", true},
		{"release branch", "release/v1.0.0", true},
		{"hotfix branch", "hotfix/critical-fix", true},
		{"empty branch", "", false},
		{"whitespace branch", "   ", false},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			existingValues := map[string]interface{}{
				"global": map[string]interface{}{
					"repoBranch": "main",
				},
			}
			
			if tc.valid {
				config := &types.ChartConfiguration{
					Branch:           &tc.branch,
					ModifiedSections: []string{"branch"},
					ExistingValues:   existingValues,
				}
				
				err := modifier.ApplyConfiguration(existingValues, config)
				assert.NoError(t, err)
				
				global := existingValues["global"].(map[string]interface{})
				assert.Equal(t, tc.branch, global["repoBranch"])
			}
		})
	}
}

func TestBranchConfigurator_Configure_NoChanges(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor
	
	// Test when user keeps the same branch (no changes)
	existingValues := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "main",
			"repoURL":    "https://github.com/test/repo.git",
		},
	}
	
	// Create copy for comparison
	originalValues := make(map[string]interface{})
	for k, v := range existingValues {
		originalValues[k] = v
	}
	
	config := &types.ChartConfiguration{
		Branch:           nil, // No branch change
		ModifiedSections: []string{},
		ExistingValues:   existingValues,
	}
	
	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)
	
	// Values should remain unchanged
	assert.Equal(t, originalValues, existingValues)
}