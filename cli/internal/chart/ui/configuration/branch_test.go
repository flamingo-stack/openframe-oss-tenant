package configuration

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/ui/templates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
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

	// Create configuration with existing values using new deployment structure
	existingValues := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"repository": map[string]interface{}{
					"branch": "main",
				},
			},
		},
	}

	// This test would require user interaction, so we'll test the underlying logic
	// by directly calling the modifier methods
	currentBranch := modifier.GetCurrentOSSBranch(existingValues)
	assert.Equal(t, "main", currentBranch)
}

func TestBranchConfigurator_Configure_CustomBranch(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor

	// Test the modifier can handle custom branch changes using new deployment structure
	existingValues := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"repository": map[string]interface{}{
					"branch": "main",
				},
			},
		},
	}

	// Simulate custom branch selection for OSS deployment
	newBranch := "develop"
	deploymentMode := types.DeploymentModeOSS
	config := &types.ChartConfiguration{
		Branch:           &newBranch,
		DeploymentMode:   &deploymentMode,
		ModifiedSections: []string{"branch"},
		ExistingValues:   existingValues,
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)

	// Verify branch was updated in deployment structure
	deployment := existingValues["deployment"].(map[string]interface{})
	oss := deployment["oss"].(map[string]interface{})
	repository := oss["repository"].(map[string]interface{})
	assert.Equal(t, "develop", repository["branch"])
}

func TestBranchConfigurator_Configure_WithEmptyValues(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor

	// Test with empty values (no deployment section)
	existingValues := map[string]interface{}{}

	currentBranch := modifier.GetCurrentOSSBranch(existingValues)
	assert.Equal(t, "main", currentBranch) // Should return default

	// Test applying custom branch to empty values for OSS deployment
	newBranch := "feature-branch"
	deploymentMode := types.DeploymentModeOSS
	config := &types.ChartConfiguration{
		Branch:           &newBranch,
		DeploymentMode:   &deploymentMode,
		ModifiedSections: []string{"branch"},
		ExistingValues:   existingValues,
	}

	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)

	// Verify deployment structure was created
	deployment, ok := existingValues["deployment"].(map[string]interface{})
	assert.True(t, ok)
	oss, ok := deployment["oss"].(map[string]interface{})
	assert.True(t, ok)
	repository, ok := oss["repository"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "feature-branch", repository["branch"])
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
				"deployment": map[string]interface{}{
					"oss": map[string]interface{}{
						"repository": map[string]interface{}{
							"branch": "main",
						},
					},
				},
			}

			if tc.valid {
				deploymentMode := types.DeploymentModeOSS
				config := &types.ChartConfiguration{
					Branch:           &tc.branch,
					DeploymentMode:   &deploymentMode,
					ModifiedSections: []string{"branch"},
					ExistingValues:   existingValues,
				}

				err := modifier.ApplyConfiguration(existingValues, config)
				assert.NoError(t, err)

				deployment := existingValues["deployment"].(map[string]interface{})
				oss := deployment["oss"].(map[string]interface{})
				repository := oss["repository"].(map[string]interface{})
				assert.Equal(t, tc.branch, repository["branch"])
			}
		})
	}
}

func TestBranchConfigurator_Configure_NoChanges(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewBranchConfigurator(modifier) // Test constructor

	// Test when user keeps the same branch (no changes)
	existingValues := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"repository": map[string]interface{}{
					"branch": "main",
				},
			},
		},
	}

	// Create copy for comparison
	originalValues := make(map[string]interface{})
	for k, v := range existingValues {
		if subMap, ok := v.(map[string]interface{}); ok {
			originalSubMap := make(map[string]interface{})
			for subK, subV := range subMap {
				if subSubMap, ok := subV.(map[string]interface{}); ok {
					originalSubSubMap := make(map[string]interface{})
					for subSubK, subSubV := range subSubMap {
						if subSubSubMap, ok := subSubV.(map[string]interface{}); ok {
							originalSubSubSubMap := make(map[string]interface{})
							for subSubSubK, subSubSubV := range subSubSubMap {
								originalSubSubSubMap[subSubSubK] = subSubSubV
							}
							originalSubSubMap[subSubK] = originalSubSubSubMap
						} else {
							originalSubSubMap[subSubK] = subSubV
						}
					}
					originalSubMap[subK] = originalSubSubMap
				} else {
					originalSubMap[subK] = subV
				}
			}
			originalValues[k] = originalSubMap
		} else {
			originalValues[k] = v
		}
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
