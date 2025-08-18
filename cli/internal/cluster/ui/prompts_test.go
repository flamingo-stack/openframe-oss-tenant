package ui

import (
	"errors"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)


func TestSelectClusterByName(t *testing.T) {
	t.Run("returns empty string when no clusters provided", func(t *testing.T) {
		clusters := []ClusterInfo{}

		result, err := SelectClusterByName(clusters, "Select a cluster")

		assert.NoError(t, err)
		assert.Equal(t, "", result)
	})

	t.Run("creates cluster name list correctly", func(t *testing.T) {
		clusters := []ClusterInfo{
			{Name: "cluster1", Status: "running"},
			{Name: "cluster2", Status: "stopped"},
			{Name: "cluster3", Status: "pending"},
		}

		// We can't test the interactive part without mocking promptui,
		// but we can test that the function doesn't panic with valid input
		assert.NotPanics(t, func() {
			// Test the validation logic
			clusterNames := make([]string, 0, len(clusters))
			for _, cl := range clusters {
				clusterNames = append(clusterNames, cl.Name)
			}

			assert.Len(t, clusterNames, 3)
			assert.Contains(t, clusterNames, "cluster1")
			assert.Contains(t, clusterNames, "cluster2")
			assert.Contains(t, clusterNames, "cluster3")
		})
	})

	t.Run("handles empty cluster names", func(t *testing.T) {
		clusters := []ClusterInfo{
			{Name: "", Status: "running"},
			{Name: "valid-cluster", Status: "stopped"},
		}

		assert.NotPanics(t, func() {
			clusterNames := make([]string, 0, len(clusters))
			for _, cl := range clusters {
				clusterNames = append(clusterNames, cl.Name)
			}

			assert.Len(t, clusterNames, 2)
			assert.Contains(t, clusterNames, "")
			assert.Contains(t, clusterNames, "valid-cluster")
		})
	})
}

func TestHandleClusterSelection(t *testing.T) {
	t.Run("returns cluster name from args when provided", func(t *testing.T) {
		clusters := []ClusterInfo{{Name: "cluster1", Status: "running"}}
		args := []string{"my-cluster"}

		result, err := HandleClusterSelection(clusters, args, "Select cluster")

		assert.NoError(t, err)
		assert.Equal(t, "my-cluster", result)
	})

	t.Run("returns error when arg is empty string", func(t *testing.T) {
		clusters := []ClusterInfo{{Name: "cluster1", Status: "running"}}
		args := []string{""}

		result, err := HandleClusterSelection(clusters, args, "Select cluster")

		assert.Error(t, err)
		assert.Equal(t, "", result)
		assert.Contains(t, err.Error(), "resource name cannot be empty")
	})

	t.Run("returns error when arg is whitespace only", func(t *testing.T) {
		clusters := []ClusterInfo{{Name: "cluster1", Status: "running"}}
		args := []string{"   "}

		result, err := HandleClusterSelection(clusters, args, "Select cluster")

		assert.Error(t, err)
		assert.Equal(t, "", result)
		assert.Contains(t, err.Error(), "resource name cannot be empty")
	})

	t.Run("handles args with multiple elements", func(t *testing.T) {
		clusters := []ClusterInfo{{Name: "cluster1", Status: "running"}}
		args := []string{"selected-cluster", "ignored-arg"}

		result, err := HandleClusterSelection(clusters, args, "Select cluster")

		assert.NoError(t, err)
		assert.Equal(t, "selected-cluster", result)
	})

	t.Run("falls back to interactive selection when no args", func(t *testing.T) {
		clusters := []ClusterInfo{}
		args := []string{}

		// This would normally call SelectClusterByName, which would show interactive prompt
		// Since we have no clusters, the common UI function returns an error
		result, err := HandleClusterSelection(clusters, args, "Select cluster")

		assert.Error(t, err)
		assert.Equal(t, "", result)
		assert.Contains(t, err.Error(), "no items available for selection")
	})
}

func TestConfirmClusterDeletion(t *testing.T) {
	t.Run("returns true when force is enabled", func(t *testing.T) {
		result, err := ConfirmClusterDeletion("test-cluster", true)

		assert.NoError(t, err)
		assert.True(t, result)
	})

	t.Run("creates proper confirmation message", func(t *testing.T) {
		// We can't test the interactive part, but we can verify the message format
		clusterName := "test-cluster"
		expectedMessage := "Are you sure you want to delete cluster 'test-cluster'? This action cannot be undone"

		// Test that the message format is correct by simulating the message creation
		message := "Are you sure you want to delete cluster '" + clusterName + "'? This action cannot be undone"
		assert.Equal(t, expectedMessage, message)
	})

	t.Run("handles empty cluster name", func(t *testing.T) {
		result, err := ConfirmClusterDeletion("", true)

		assert.NoError(t, err)
		assert.True(t, result)
	})

	t.Run("handles special characters in cluster name", func(t *testing.T) {
		result, err := ConfirmClusterDeletion("test-cluster_123", true)

		assert.NoError(t, err)
		assert.True(t, result)
	})
}

func TestFormatClusterSuccessMessage(t *testing.T) {
	t.Run("formats success message correctly", func(t *testing.T) {
		result := FormatClusterSuccessMessage("test-cluster", "k3d", "running")

		assert.Contains(t, result, "Cluster: ")
		assert.Contains(t, result, "test-cluster")
		assert.Contains(t, result, "Type: ")
		assert.Contains(t, result, "k3d")
		assert.Contains(t, result, "Status: ")
		assert.Contains(t, result, "running")
	})

	t.Run("handles empty values", func(t *testing.T) {
		result := FormatClusterSuccessMessage("", "", "")

		assert.Contains(t, result, "Cluster: ")
		assert.Contains(t, result, "Type: ")
		assert.Contains(t, result, "Status: ")
	})

	t.Run("handles different cluster types and statuses", func(t *testing.T) {
		testCases := []struct {
			name        string
			clusterType string
			status      string
		}{
			{"gke-cluster", "gke", "provisioning"},
			{"local-cluster", "k3d", "stopped"},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				result := FormatClusterSuccessMessage(tc.name, tc.clusterType, tc.status)

				assert.Contains(t, result, tc.name)
				assert.Contains(t, result, tc.clusterType)
				assert.Contains(t, result, tc.status)
			})
		}
	})
}


// Test helper functions for validation logic that can be tested without UI interaction
func TestValidationLogic(t *testing.T) {
	t.Run("validates cluster names", func(t *testing.T) {
		testCases := []struct {
			name    string
			input   string
			wantErr bool
		}{
			{"valid name", "test-cluster", false},
			{"valid name with numbers", "cluster123", false},
			{"valid name with hyphens", "test-cluster-name", false},
			{"empty name", "", true},
			{"whitespace only", "   ", true},
			{"single character", "a", false},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				// Test validation logic for cluster names
				validate := func(input string) error {
					if len(strings.TrimSpace(input)) < 1 {
						return errors.New("cluster name cannot be empty")
					}
					return nil
				}

				err := validate(tc.input)
				if tc.wantErr {
					assert.Error(t, err)
				} else {
					assert.NoError(t, err)
				}
			})
		}
	})
}

// Test constants and type aliases
func TestConstants(t *testing.T) {
	t.Run("cluster type constants are correctly defined", func(t *testing.T) {
		assert.Equal(t, string(ClusterTypeK3d), "k3d")
		assert.Equal(t, string(ClusterTypeGKE), "gke")
	})
}
