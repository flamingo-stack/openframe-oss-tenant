package ui

import (
	"errors"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
)

func TestOperationsUI_SelectClusterForOperation(t *testing.T) {
	ui := NewOperationsUI()

	t.Run("returns cluster name from args when provided", func(t *testing.T) {
		clusters := []models.ClusterInfo{
			{Name: "test-cluster", Type: models.ClusterTypeK3d},
		}
		args := []string{"test-cluster"}

		result, err := ui.SelectClusterForOperation(clusters, args, "cleanup")

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		if result != "test-cluster" {
			t.Errorf("expected 'test-cluster', got %s", result)
		}
	})

	t.Run("returns error when cluster name is empty", func(t *testing.T) {
		clusters := []models.ClusterInfo{
			{Name: "test-cluster", Type: models.ClusterTypeK3d},
		}
		args := []string{""}

		_, err := ui.SelectClusterForOperation(clusters, args, "cleanup")

		if err == nil {
			t.Error("expected error for empty cluster name")
		}
	})

	t.Run("returns empty string when no clusters available", func(t *testing.T) {
		clusters := []models.ClusterInfo{}
		args := []string{}

		result, err := ui.SelectClusterForOperation(clusters, args, "cleanup")

		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		if result != "" {
			t.Errorf("expected empty string, got %s", result)
		}
	})

	t.Run("handles whitespace-only cluster name", func(t *testing.T) {
		clusters := []models.ClusterInfo{
			{Name: "test-cluster", Type: models.ClusterTypeK3d},
		}
		args := []string{"   "}

		_, err := ui.SelectClusterForOperation(clusters, args, "cleanup")

		if err == nil {
			t.Error("expected error for whitespace-only cluster name")
		}
	})
}

func TestNewOperationsUI(t *testing.T) {
	ui := NewOperationsUI()

	if ui == nil {
		t.Fatal("NewOperationsUI should not return nil")
	}
}

func TestOperationsUI_ShowOperationStart(t *testing.T) {
	ui := NewOperationsUI()

	t.Run("shows cleanup operation start without panicking", func(t *testing.T) {
		// This test verifies the function doesn't panic
		// The actual output is tested manually since it involves UI rendering
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationStart panicked: %v", r)
			}
		}()

		ui.ShowOperationStart("cleanup", "test-cluster")
	})

	t.Run("shows start operation start without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationStart panicked: %v", r)
			}
		}()

		ui.ShowOperationStart("cleanup", "test-cluster")
	})

	t.Run("shows generic operation start without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationStart panicked: %v", r)
			}
		}()

		ui.ShowOperationStart("unknown", "test-cluster")
	})
}

func TestOperationsUI_ShowOperationSuccess(t *testing.T) {
	ui := NewOperationsUI()

	t.Run("shows cleanup success without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationSuccess panicked: %v", r)
			}
		}()

		ui.ShowOperationSuccess("cleanup", "test-cluster")
	})

	t.Run("shows start success without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationSuccess panicked: %v", r)
			}
		}()

		ui.ShowOperationSuccess("cleanup", "test-cluster")
	})

	t.Run("shows generic success without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationSuccess panicked: %v", r)
			}
		}()

		ui.ShowOperationSuccess("unknown", "test-cluster")
	})
}

func TestOperationsUI_ShowOperationError(t *testing.T) {
	ui := NewOperationsUI()
	testErr := errors.New("test error message")

	t.Run("shows cleanup error without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationError panicked: %v", r)
			}
		}()

		ui.ShowOperationError("cleanup", "test-cluster", testErr)
	})

	t.Run("shows start error without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationError panicked: %v", r)
			}
		}()

		ui.ShowOperationError("cleanup", "test-cluster", testErr)
	})

	t.Run("shows generic error without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowOperationError panicked: %v", r)
			}
		}()

		ui.ShowOperationError("unknown", "test-cluster", testErr)
	})
}

func TestOperationsUI_ShowNoResourcesMessage(t *testing.T) {
	ui := NewOperationsUI()

	t.Run("shows no resources message without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowNoResourcesMessage panicked: %v", r)
			}
		}()

		ui.ShowNoResourcesMessage("clusters", "cleanup")
	})

	t.Run("handles empty parameters without panicking", func(t *testing.T) {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("ShowNoResourcesMessage panicked: %v", r)
			}
		}()

		ui.ShowNoResourcesMessage("", "")
	})
}
