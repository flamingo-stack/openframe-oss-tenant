package ui

import (
	"testing"

	"github.com/pterm/pterm"
)

func TestGetStatusColor(t *testing.T) {
	tests := []struct {
		status   string
		expected string
	}{
		{"running", "green"},
		{"RUNNING", "green"},
		{"ready", "green"},
		{"stopped", "yellow"},
		{"pending", "yellow"},
		{"error", "red"},
		{"failed", "red"},
		{"unknown", "gray"},
		{"", "gray"},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			colorFunc := GetStatusColor(tt.status)
			if colorFunc == nil {
				t.Errorf("GetStatusColor(%q) returned nil", tt.status)
			}
			// Test that function doesn't panic
			result := colorFunc("test")
			if result == "" {
				t.Errorf("GetStatusColor(%q) returned empty string", tt.status)
			}
		})
	}
}

func TestRenderTableWithFallback(t *testing.T) {
	testData := pterm.TableData{
		{"Name", "Type", "Status", "Nodes", "Created"},
		{"test-cluster", "k3d", "running", "3", "2023-01-01"},
	}

	// Should not panic
	err := RenderTableWithFallback(testData, true)
	if err != nil {
		t.Errorf("RenderTableWithFallback failed: %v", err)
	}

	// Test without header
	err = RenderTableWithFallback(testData, false)
	if err != nil {
		t.Errorf("RenderTableWithFallback without header failed: %v", err)
	}
}

func TestRenderKeyValueTable(t *testing.T) {
	testData := pterm.TableData{
		{"Property", "Value"},
		{"Name", "test-cluster"},
		{"Type", "k3d"},
		{"Status", "running"},
	}

	// Should not panic
	err := RenderKeyValueTable(testData)
	if err != nil {
		t.Errorf("RenderKeyValueTable failed: %v", err)
	}
}

func TestRenderNodeTable(t *testing.T) {
	testData := pterm.TableData{
		{"NAME", "ROLE", "STATUS", "AGE"},
		{"node-1", "control-plane", "Ready", "5m"},
		{"node-2", "worker", "Ready", "4m"},
	}

	// Should not panic
	err := RenderNodeTable(testData)
	if err != nil {
		t.Errorf("RenderNodeTable failed: %v", err)
	}
}

func TestShowSuccessBox(t *testing.T) {
	// Should not panic
	ShowSuccessBox("Test Title", "Test content message")
	ShowSuccessBox("", "")
}