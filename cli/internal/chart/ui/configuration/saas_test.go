package configuration

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfigurationWizard_GetSaaSBranchFromValues(t *testing.T) {
	wizard := NewConfigurationWizard()

	tests := []struct {
		name           string
		values         map[string]interface{}
		expectedBranch string
	}{
		{
			name:           "Nil values returns default",
			values:         nil,
			expectedBranch: "main",
		},
		{
			name:           "Empty values returns default",
			values:         map[string]interface{}{},
			expectedBranch: "main",
		},
		{
			name: "Values with SaaS branch",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"saas": map[string]interface{}{
						"repository": map[string]interface{}{
							"branch": "develop",
						},
					},
				},
			},
			expectedBranch: "develop",
		},
		{
			name: "Values with incomplete structure",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"saas": map[string]interface{}{},
				},
			},
			expectedBranch: "main",
		},
		{
			name: "Values with different branch",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"saas": map[string]interface{}{
						"repository": map[string]interface{}{
							"branch": "feature/test",
						},
					},
				},
			},
			expectedBranch: "feature/test",
		},
		{
			name: "Values with OSS branch only",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"oss": map[string]interface{}{
						"repository": map[string]interface{}{
							"branch": "oss-branch",
						},
					},
				},
			},
			expectedBranch: "main",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := wizard.getSaaSBranchFromValues(tt.values)
			assert.Equal(t, tt.expectedBranch, result)
		})
	}
}

func TestConfigurationWizard_SaaSBranchExtraction(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Test complex nested structure
	values := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "global-main",
		},
		"deployment": map[string]interface{}{
			"saas": map[string]interface{}{
				"enabled": true,
				"repository": map[string]interface{}{
					"branch":   "saas-develop",
					"password": "hidden",
					"url":      "https://github.com/org/saas-repo.git",
				},
				"config": map[string]interface{}{
					"password": "config-pass",
				},
			},
			"oss": map[string]interface{}{
				"enabled": false,
				"repository": map[string]interface{}{
					"branch": "oss-main",
				},
			},
		},
	}

	saasBranch := wizard.getSaaSBranchFromValues(values)
	assert.Equal(t, "saas-develop", saasBranch)

	// Test OSS branch extraction via modifier
	ossBranch := wizard.modifier.GetCurrentOSSBranch(values)
	assert.Equal(t, "oss-main", ossBranch)
}

func TestConfigurationWizard_SaaSConfigStructure(t *testing.T) {
	// Test that SaaS configuration maintains proper structure
	values := map[string]interface{}{
		"deployment": map[string]interface{}{
			"saas": map[string]interface{}{
				"repository": map[string]interface{}{
					"branch": "main",
				},
			},
		},
	}

	// Verify branch extraction
	wizard := NewConfigurationWizard()
	branch := wizard.getSaaSBranchFromValues(values)
	assert.Equal(t, "main", branch)

	// Test with missing repository section
	valuesNoRepo := map[string]interface{}{
		"deployment": map[string]interface{}{
			"saas": map[string]interface{}{
				"enabled": true,
			},
		},
	}

	branchNoRepo := wizard.getSaaSBranchFromValues(valuesNoRepo)
	assert.Equal(t, "main", branchNoRepo) // Should return default
}