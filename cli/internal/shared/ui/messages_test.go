package ui

import (
	"errors"
	"testing"
)

func TestShowOperationError(t *testing.T) {
	// Test that ShowOperationError doesn't panic with various inputs
	tips := []TroubleshootingTip{
		{Description: "Check status", Command: "kubectl get pods"},
		{Description: "Check logs", Command: "kubectl logs"},
	}
	
	// Should not panic with normal inputs
	ShowOperationError("test", "resource-name", errors.New("test error"), tips)
	
	// Should not panic with empty tips
	ShowOperationError("test", "resource-name", errors.New("test error"), []TroubleshootingTip{})
	
	// Should not panic with nil tips
	ShowOperationError("test", "resource-name", errors.New("test error"), nil)
}

func TestShowNoResourcesMessage(t *testing.T) {
	// Should not panic with normal inputs
	ShowNoResourcesMessage("clusters", "delete", "create command", "list command")
	
	// Should not panic with empty strings
	ShowNoResourcesMessage("", "", "", "")
}

func TestShowOperationStart(t *testing.T) {
	customMessages := map[string]string{
		"cleanup": "Starting cleanup...",
		"delete":  "Deleting resource...",
	}
	
	// Should not panic with custom messages
	ShowOperationStart("cleanup", "test-resource", customMessages)
	
	// Should not panic with fallback message
	ShowOperationStart("unknown", "test-resource", customMessages)
	
	// Should not panic with nil map
	ShowOperationStart("test", "test-resource", nil)
}

func TestShowOperationSuccess(t *testing.T) {
	customMessages := map[string]string{
		"cleanup": "Cleanup completed!",
		"delete":  "Resource deleted!",
	}
	
	// Should not panic with custom messages
	ShowOperationSuccess("cleanup", "test-resource", customMessages)
	
	// Should not panic with fallback message
	ShowOperationSuccess("unknown", "test-resource", customMessages)
	
	// Should not panic with nil map
	ShowOperationSuccess("test", "test-resource", nil)
}