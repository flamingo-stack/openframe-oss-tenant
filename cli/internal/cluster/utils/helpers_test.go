package utils

import (
	"testing"

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
	
	t.Run("validates cluster name with underscores", func(t *testing.T) {
		err := ValidateClusterName("test_cluster")
		assert.NoError(t, err)
	})
	
	t.Run("rejects empty cluster name", func(t *testing.T) {
		err := ValidateClusterName("")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty")
	})
	
	t.Run("rejects whitespace-only cluster name", func(t *testing.T) {
		err := ValidateClusterName("   ")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty or whitespace only")
	})
	
	t.Run("rejects cluster name with only tabs", func(t *testing.T) {
		err := ValidateClusterName("\t\t")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty or whitespace only")
	})
	
	t.Run("rejects cluster name with mixed whitespace", func(t *testing.T) {
		err := ValidateClusterName(" \t \n ")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster name cannot be empty or whitespace only")
	})
}

func TestParseClusterType(t *testing.T) {
	t.Run("parses k3d cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("k3d")
		assert.Equal(t, ClusterTypeK3d, clusterType)
	})
	
	t.Run("parses K3D cluster type case insensitive", func(t *testing.T) {
		clusterType := ParseClusterType("K3D")
		assert.Equal(t, ClusterTypeK3d, clusterType)
	})
	
	t.Run("parses gke cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("gke")
		assert.Equal(t, ClusterTypeGKE, clusterType)
	})
	
	t.Run("parses GKE cluster type case insensitive", func(t *testing.T) {
		clusterType := ParseClusterType("GKE")
		assert.Equal(t, ClusterTypeGKE, clusterType)
	})
	
	t.Run("parses eks cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("eks")
		assert.Equal(t, ClusterTypeEKS, clusterType)
	})
	
	t.Run("parses EKS cluster type case insensitive", func(t *testing.T) {
		clusterType := ParseClusterType("EKS")
		assert.Equal(t, ClusterTypeEKS, clusterType)
	})
	
	t.Run("defaults to k3d for unknown cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("unknown")
		assert.Equal(t, ClusterTypeK3d, clusterType)
	})
	
	t.Run("defaults to k3d for empty cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("")
		assert.Equal(t, ClusterTypeK3d, clusterType)
	})
	
	t.Run("handles mixed case unknown cluster type", func(t *testing.T) {
		clusterType := ParseClusterType("AKS") // Not supported, should default
		assert.Equal(t, ClusterTypeK3d, clusterType)
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
			Type: ClusterTypeK3d,
		}
		
		assert.Equal(t, "test-cluster", result.Name)
		assert.Equal(t, ClusterTypeK3d, result.Type)
	})
	
	t.Run("creates cluster selection result with different types", func(t *testing.T) {
		tests := []struct {
			name        string
			clusterType ClusterType
		}{
			{"k3d-cluster", ClusterTypeK3d},
			{"gke-cluster", ClusterTypeGKE},
			{"eks-cluster", ClusterTypeEKS},
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
		err := CreateClusterError("create", "test-cluster", ClusterTypeK3d, originalErr)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster create operation failed")
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "k3d")
		assert.Contains(t, err.Error(), originalErr.Error())
	})
	
	t.Run("creates cluster error for delete operation", func(t *testing.T) {
		originalErr := assert.AnError
		err := CreateClusterError("delete", "my-cluster", ClusterTypeGKE, originalErr)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster delete operation failed")
		assert.Contains(t, err.Error(), "my-cluster")
		assert.Contains(t, err.Error(), "gke")
	})
	
	t.Run("creates cluster error for start operation", func(t *testing.T) {
		originalErr := assert.AnError
		err := CreateClusterError("start", "another-cluster", ClusterTypeEKS, originalErr)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cluster start operation failed")
		assert.Contains(t, err.Error(), "another-cluster")
		assert.Contains(t, err.Error(), "eks")
	})
	
	t.Run("wraps original error correctly", func(t *testing.T) {
		originalErr := assert.AnError
		err := CreateClusterError("test", "cluster", ClusterTypeK3d, originalErr)
		
		// The error should wrap the original error
		assert.ErrorIs(t, err, originalErr)
	})
}

func TestTypeAliases(t *testing.T) {
	t.Run("cluster type aliases work correctly", func(t *testing.T) {
		// Test that the type aliases are correctly set up
		var ct ClusterType = ClusterTypeK3d
		assert.Equal(t, "k3d", string(ct))
		
		ct = ClusterTypeGKE
		assert.Equal(t, "gke", string(ct))
		
		ct = ClusterTypeEKS
		assert.Equal(t, "eks", string(ct))
	})
	
	t.Run("cluster info alias works correctly", func(t *testing.T) {
		info := ClusterInfo{
			Name: "test-cluster",
			Type: ClusterTypeK3d,
		}
		
		assert.Equal(t, "test-cluster", info.Name)
		assert.Equal(t, ClusterTypeK3d, info.Type)
	})
	
	t.Run("node info alias works correctly", func(t *testing.T) {
		node := NodeInfo{
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
		assert.Equal(t, "k3d", string(ClusterTypeK3d))
		assert.Equal(t, "gke", string(ClusterTypeGKE))
		assert.Equal(t, "eks", string(ClusterTypeEKS))
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("handles various whitespace combinations in cluster name validation", func(t *testing.T) {
		testCases := []struct {
			name     string
			input    string
			wantErr  bool
			errMsg   string
		}{
			{"normal name", "test-cluster", false, ""},
			{"name with spaces around", "  test-cluster  ", false, ""},
			{"empty string", "", true, "cluster name cannot be empty"},
			{"only spaces", "   ", true, "cluster name cannot be empty or whitespace only"},
			{"only tabs", "\t\t\t", true, "cluster name cannot be empty or whitespace only"},
			{"only newlines", "\n\n", true, "cluster name cannot be empty or whitespace only"},
			{"mixed whitespace", " \t\n ", true, "cluster name cannot be empty or whitespace only"},
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
			expected ClusterType
		}{
			{"lowercase k3d", "k3d", ClusterTypeK3d},
			{"uppercase k3d", "K3D", ClusterTypeK3d},
			{"mixed case k3d", "K3d", ClusterTypeK3d},
			{"lowercase gke", "gke", ClusterTypeGKE},
			{"uppercase gke", "GKE", ClusterTypeGKE},
			{"mixed case gke", "Gke", ClusterTypeGKE},
			{"lowercase eks", "eks", ClusterTypeEKS},
			{"uppercase eks", "EKS", ClusterTypeEKS},
			{"mixed case eks", "Eks", ClusterTypeEKS},
			{"unknown type", "docker", ClusterTypeK3d},
			{"empty string", "", ClusterTypeK3d},
			{"whitespace", "  ", ClusterTypeK3d},
		}
		
		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result := ParseClusterType(tc.input)
				assert.Equal(t, tc.expected, result)
			})
		}
	})
}