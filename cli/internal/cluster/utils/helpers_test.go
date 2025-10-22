package utils

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/stretchr/testify/assert"
)

func TestValidateClusterName(t *testing.T) {
	t.Run("validates valid cluster name", func(t *testing.T) {
		err := ValidateClusterName("test-cluster")
		assert.NoError(t, err)
	})

	t.Run("validates cluster name with numbers", func(t *testing.T) {
		err := ValidateClusterName("cluster-123")
		assert.NoError(t, err)
	})

	t.Run("rejects cluster name with underscores", func(t *testing.T) {
		err := ValidateClusterName("test_cluster")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "must contain only letters, numbers, and hyphens")
	})

	t.Run("rejects empty cluster name", func(t *testing.T) {
		err := ValidateClusterName("")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty")
	})

	t.Run("rejects whitespace-only cluster name", func(t *testing.T) {
		err := ValidateClusterName("   ")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty or contain only whitespace")
	})

	t.Run("rejects cluster name with only tabs", func(t *testing.T) {
		err := ValidateClusterName("\t\t")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty or contain only whitespace")
	})

	t.Run("rejects cluster name with mixed whitespace", func(t *testing.T) {
		err := ValidateClusterName(" \t \n ")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty or contain only whitespace")
	})
}

func TestParseClusterType(t *testing.T) {
	t.Run("parses k3d cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("k3d")
		assert.Equal(t, models.ClusterTypeK3d, clusterType)
	})

	t.Run("parses K3D cluster type case insensitive", func(t *testing.T) {
		clusterType := ParseClusterType("K3D")
		assert.Equal(t, models.ClusterTypeK3d, clusterType)
	})

	t.Run("parses gke cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("gke")
		assert.Equal(t, models.ClusterTypeGKE, clusterType)
	})

	t.Run("parses GKE cluster type case insensitive", func(t *testing.T) {
		clusterType := ParseClusterType("GKE")
		assert.Equal(t, models.ClusterTypeGKE, clusterType)
	})

	t.Run("defaults to k3d for unknown cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("unknown")
		assert.Equal(t, models.ClusterTypeK3d, clusterType)
	})

	t.Run("defaults to k3d for empty cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("")
		assert.Equal(t, models.ClusterTypeK3d, clusterType)
	})

	t.Run("handles mixed case unknown cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("AKS") // Not supported, should default
		assert.Equal(t, models.ClusterTypeK3d, clusterType)
	})
}

func TestGetNodeCount(t *testing.T) {
	t.Run("returns valid node count", func(t *testing.T) {
		nodeCount := GetNodeCount(5)
		assert.Equal(t, 5, nodeCount)
	})

	t.Run("returns valid node count for 1", func(t *testing.T) {
		nodeCount := GetNodeCount(1)
		assert.Equal(t, 1, nodeCount)
	})

	t.Run("returns valid node count for large number", func(t *testing.T) {
		nodeCount := GetNodeCount(100)
		assert.Equal(t, 100, nodeCount)
	})

	t.Run("defaults zero node count to 3", func(t *testing.T) {
		nodeCount := GetNodeCount(0)
		assert.Equal(t, 3, nodeCount)
	})

	t.Run("defaults negative node count to 3", func(t *testing.T) {
		nodeCount := GetNodeCount(-1)
		assert.Equal(t, 3, nodeCount)
	})

	t.Run("defaults large negative node count to 3", func(t *testing.T) {
		nodeCount := GetNodeCount(-100)
		assert.Equal(t, 3, nodeCount)
	})
}

func TestClusterSelectionResult(t *testing.T) {
	t.Run("creates cluster selection result", func(t *testing.T) {
		result := ClusterSelectionResult{
			Name: "test-cluster",
			Type: models.ClusterTypeK3d,
		}

		assert.Equal(t, "test-cluster", result.Name)
		assert.Equal(t, models.ClusterTypeK3d, result.Type)
	})

	t.Run("creates cluster selection result with different types", func(t *testing.T) {
		tests := []struct {
			name        string
			clusterType models.ClusterType
		}{
			{"k3d-cluster", models.ClusterTypeK3d},
			{"gke-cluster", models.ClusterTypeGKE},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := ClusterSelectionResult{
					Name: tt.name,
					Type: tt.clusterType,
				}

				assert.Equal(t, tt.name, result.Name)
				assert.Equal(t, tt.clusterType, result.Type)
			})
		}
	})
}

func TestCreateClusterError(t *testing.T) {
	t.Run("creates cluster error with all parameters", func(t *testing.T) {
		originalErr := assert.AnError
		err := CreateClusterError("create", "test-cluster", models.ClusterTypeK3d, originalErr)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster create operation failed")
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "k3d")
		assert.Contains(t, err.Error(), originalErr.Error())
	})

	t.Run("creates cluster error for delete operation", func(t *testing.T) {
		originalErr := assert.AnError
		err := CreateClusterError("delete", "my-cluster", models.ClusterTypeGKE, originalErr)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster delete operation failed")
		assert.Contains(t, err.Error(), "my-cluster")
		assert.Contains(t, err.Error(), "gke")
	})

	t.Run("wraps original error correctly", func(t *testing.T) {
		originalErr := assert.AnError
		err := CreateClusterError("test", "cluster", models.ClusterTypeK3d, originalErr)

		// The error should wrap the original error
		assert.ErrorIs(t, err, originalErr)
	})
}

func TestTypeAliases(t *testing.T) {
	t.Run("cluster type aliases work correctly", func(t *testing.T) {
		// Test that the type aliases are correctly set up
		var ct models.ClusterType = models.ClusterTypeK3d
		assert.Equal(t, "k3d", string(ct))

		ct = models.ClusterTypeGKE
		assert.Equal(t, "gke", string(ct))
	})

	t.Run("cluster info alias works correctly", func(t *testing.T) {
		info := models.ClusterInfo{
			Name: "test-cluster",
			Type: models.ClusterTypeK3d,
		}

		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, models.ClusterTypeK3d, info.Type)
	})

	t.Run("node info alias works correctly", func(t *testing.T) {
		node := models.NodeInfo{
			Name:   "test-node",
			Status: "ready",
			Role:   "worker",
		}

		assert.Equal(t, "test-node", node.Name)
		assert.Equal(t, "ready", node.Status)
		assert.Equal(t, "worker", node.Role)
	})
}

func TestConstants(t *testing.T) {
	t.Run("cluster type constants are correctly re-exported", func(t *testing.T) {
		// Verify that the constants match the expected string values
		assert.Equal(t, "k3d", string(models.ClusterTypeK3d))
		assert.Equal(t, "gke", string(models.ClusterTypeGKE))
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("handles various whitespace combinations in cluster name validation", func(t *testing.T) {
		testCases := []struct {
			name    string
			input   string
			wantErr bool
			errMsg  string
		}{
			{"normal name", "test-cluster", false, ""},
			{"name with spaces around", "  test-cluster  ", false, ""},
			{"empty string", "", true, "cluster name cannot be empty"},
			{"only spaces", "   ", true, "cluster name cannot be empty or contain only whitespace"},
			{"only tabs", "\t\t\t", true, "cluster name cannot be empty or contain only whitespace"},
			{"only newlines", "\n\n", true, "cluster name cannot be empty or contain only whitespace"},
			{"mixed whitespace", " \t\n ", true, "cluster name cannot be empty or contain only whitespace"},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				err := ValidateClusterName(tc.input)
				if tc.wantErr {
					assert.Error(t, err)
					if tc.errMsg != "" {
						assert.Contains(t, err.Error(), tc.errMsg)
					}
				} else {
					assert.NoError(t, err)
				}
			})
		}
	})

	t.Run("handles boundary values for node count", func(t *testing.T) {
		testCases := []struct {
			name     string
			input    int
			expected int
		}{
			{"minimum valid", 1, 1},
			{"normal value", 5, 5},
			{"large value", 1000, 1000},
			{"zero", 0, 3},
			{"negative small", -1, 3},
			{"negative large", -1000, 3},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result := GetNodeCount(tc.input)
				assert.Equal(t, tc.expected, result)
			})
		}
	})

	t.Run("handles case variations in cluster type parsing", func(t *testing.T) {
		testCases := []struct {
			name     string
			input    string
			expected models.ClusterType
		}{
			{"lowercase k3d", "k3d", models.ClusterTypeK3d},
			{"uppercase k3d", "K3D", models.ClusterTypeK3d},
			{"mixed case k3d", "K3d", models.ClusterTypeK3d},
			{"lowercase gke", "gke", models.ClusterTypeGKE},
			{"uppercase gke", "GKE", models.ClusterTypeGKE},
			{"mixed case gke", "Gke", models.ClusterTypeGKE},
			{"unknown type", "docker", models.ClusterTypeK3d},
			{"empty string", "", models.ClusterTypeK3d},
			{"whitespace", "  ", models.ClusterTypeK3d},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result := ParseClusterType(tc.input)
				assert.Equal(t, tc.expected, result)
			})
		}
	})
}
