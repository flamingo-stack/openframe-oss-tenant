package ui

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

// testError is a simple error implementation for testing
type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}

func init() {
	testutil.InitializeTestMode()
}

func TestNewOperationsUI(t *testing.T) {
	ui := NewOperationsUI()
	assert.NotNil(t, ui, "NewOperationsUI should not return nil")
}

func TestSelectClusterForInstall_WithClusterArgument(t *testing.T) {
	ui := NewOperationsUI()

	clusters := []models.ClusterInfo{
		{Name: "cluster1", Status: "running"},
		{Name: "cluster2", Status: "stopped"},
	}

	tests := []struct {
		name         string
		args         []string
		clusters     []models.ClusterInfo
		expectedName string
		expectError  bool
	}{
		{
			name:         "valid cluster name",
			args:         []string{"cluster1"},
			clusters:     clusters,
			expectedName: "cluster1",
			expectError:  false,
		},
		{
			name:         "empty cluster name",
			args:         []string{""},
			clusters:     clusters,
			expectedName: "",
			expectError:  true,
		},
		{
			name:         "whitespace cluster name",
			args:         []string{" \t "},
			clusters:     clusters,
			expectedName: "",
			expectError:  true,
		},
		{
			name:         "non-existent cluster",
			args:         []string{"nonexistent"},
			clusters:     clusters,
			expectedName: "",
			expectError:  true,
		},
		{
			name:         "valid cluster name with multiple args",
			args:         []string{"cluster2", "extra"},
			clusters:     clusters,
			expectedName: "cluster2",
			expectError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			selectedCluster, err := ui.SelectClusterForInstall(tt.clusters, tt.args)

			if tt.expectError {
				assert.Error(t, err)
				assert.Empty(t, selectedCluster)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedName, selectedCluster)
			}
		})
	}
}

func TestSelectClusterForInstall_InteractiveMode(t *testing.T) {
	ui := NewOperationsUI()

	clusters := []models.ClusterInfo{
		{Name: "cluster1", Status: "running"},
		{Name: "cluster2", Status: "stopped"},
	}

	// Test interactive mode (no args provided)
	// In test mode, this will fail with user cancellation (^D)
	selectedCluster, err := ui.SelectClusterForInstall(clusters, []string{})

	// Interactive mode should fail in test environment (user cancellation)
	assert.Error(t, err, "Interactive mode should error in test environment due to ^D")
	assert.Contains(t, err.Error(), "cluster selection failed")
	assert.Empty(t, selectedCluster, "Interactive mode should return empty when cancelled")
}

func TestSelectClusterForInstall_EmptyClusterList(t *testing.T) {
	ui := NewOperationsUI()

	// Test with no clusters available - the cluster selector will show a message and return empty
	selectedCluster, err := ui.SelectClusterForInstall([]models.ClusterInfo{}, []string{"cluster1"})

	// Since this delegates to cluster selector, we expect either error or empty string
	if err != nil {
		assert.Contains(t, err.Error(), "cluster")
	}
	// Either way, selected cluster should be empty
	assert.Empty(t, selectedCluster)
}

func TestShowOperationCancelled(t *testing.T) {
	ui := NewOperationsUI()

	// This method outputs to terminal, we just test it doesn't panic
	assert.NotPanics(t, func() {
		ui.ShowOperationCancelled("chart installation")
	})

	assert.NotPanics(t, func() {
		ui.ShowOperationCancelled("test operation")
	})
}

func TestShowNoClusterMessage(t *testing.T) {
	ui := NewOperationsUI()

	// This method outputs to terminal, we just test it doesn't panic
	assert.NotPanics(t, func() {
		ui.ShowNoClusterMessage()
	})
}

func TestConfirmInstallation(t *testing.T) {
	// Skip this test as it requires user interaction even in test mode
	// The method is a simple wrapper around sharedUI.ConfirmActionInteractive
	// which is already tested in the shared UI package
	t.Skip("ConfirmInstallation requires user interaction - tested in integration tests")
}

func TestShowInstallationStart(t *testing.T) {
	ui := NewOperationsUI()

	tests := []string{"test-cluster", "cluster-123", ""}

	for _, clusterName := range tests {
		t.Run("cluster_"+clusterName, func(t *testing.T) {
			// This method outputs to terminal, we just test it doesn't panic
			assert.NotPanics(t, func() {
				ui.ShowInstallationStart(clusterName)
			})
		})
	}
}

func TestShowInstallationComplete(t *testing.T) {
	ui := NewOperationsUI()

	// This method outputs to terminal, we just test it doesn't panic
	assert.NotPanics(t, func() {
		ui.ShowInstallationComplete()
	})
}

func TestShowInstallationError(t *testing.T) {
	ui := NewOperationsUI()

	testErrors := []error{
		assert.AnError,
		&testError{msg: "test error"},
		nil, // Test with nil error
	}

	for i, err := range testErrors {
		t.Run("error_case_"+string(rune('A'+i)), func(t *testing.T) {
			// This method outputs to terminal, we just test it doesn't panic
			assert.NotPanics(t, func() {
				ui.ShowInstallationError(err)
			})
		})
	}
}

func TestOperationsUI_MethodsExist(t *testing.T) {
	ui := NewOperationsUI()

	// Test that all expected methods exist by calling them
	assert.NotNil(t, ui.SelectClusterForInstall)
	assert.NotNil(t, ui.ShowOperationCancelled)
	assert.NotNil(t, ui.ShowNoClusterMessage)
	assert.NotNil(t, ui.ConfirmInstallation)
	assert.NotNil(t, ui.ConfirmInstallationOnCluster)
	assert.NotNil(t, ui.ShowInstallationStart)
	assert.NotNil(t, ui.ShowInstallationComplete)
	assert.NotNil(t, ui.ShowInstallationError)
}

func TestOperationsUI_Integration(t *testing.T) {
	// Test a complete flow scenario
	ui := NewOperationsUI()

	clusters := []models.ClusterInfo{
		{Name: "integration-test-cluster", Status: "running"},
	}

	// Test successful cluster selection with argument
	selectedCluster, err := ui.SelectClusterForInstall(clusters, []string{"integration-test-cluster"})
	assert.NoError(t, err)
	assert.Equal(t, "integration-test-cluster", selectedCluster)

	// Skip confirmation test as it requires user interaction

	// Test UI methods don't panic
	assert.NotPanics(t, func() {
		ui.ShowInstallationStart(selectedCluster)
		ui.ShowInstallationComplete()
		ui.ShowOperationCancelled("test operation")
		ui.ShowNoClusterMessage()
	})
}
