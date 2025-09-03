package ui

import (
	"testing"
	"time"

	"github.com/pterm/pterm"
	"github.com/stretchr/testify/assert"
)

func TestGetStatusColor(t *testing.T) {
	t.Run("returns green for running status", func(t *testing.T) {
		colorFunc := GetStatusColor("running")
		result := colorFunc("test")
		expected := pterm.Green("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns green for ready status", func(t *testing.T) {
		colorFunc := GetStatusColor("ready")
		result := colorFunc("test")
		expected := pterm.Green("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns yellow for stopped status", func(t *testing.T) {
		colorFunc := GetStatusColor("stopped")
		result := colorFunc("test")
		expected := pterm.Yellow("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns yellow for not ready status", func(t *testing.T) {
		colorFunc := GetStatusColor("not ready")
		result := colorFunc("test")
		expected := pterm.Yellow("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns yellow for pending status", func(t *testing.T) {
		colorFunc := GetStatusColor("pending")
		result := colorFunc("test")
		expected := pterm.Yellow("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns red for error status", func(t *testing.T) {
		colorFunc := GetStatusColor("error")
		result := colorFunc("test")
		expected := pterm.Red("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns red for failed status", func(t *testing.T) {
		colorFunc := GetStatusColor("failed")
		result := colorFunc("test")
		expected := pterm.Red("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns red for unhealthy status", func(t *testing.T) {
		colorFunc := GetStatusColor("unhealthy")
		result := colorFunc("test")
		expected := pterm.Red("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("returns gray for unknown status", func(t *testing.T) {
		colorFunc := GetStatusColor("unknown")
		result := colorFunc("test")
		expected := pterm.Gray("test")
		assert.Equal(t, expected, result)
	})
	
	t.Run("handles case insensitive status", func(t *testing.T) {
		colorFunc := GetStatusColor("RUNNING")
		result := colorFunc("test")
		expected := pterm.Green("test")
		assert.Equal(t, expected, result)
		
		colorFunc = GetStatusColor("STOPPED")
		result = colorFunc("test")
		expected = pterm.Yellow("test")
		assert.Equal(t, expected, result)
		
		colorFunc = GetStatusColor("ERROR")
		result = colorFunc("test")
		expected = pterm.Red("test")
		assert.Equal(t, expected, result)
	})
}

func TestRenderTableWithFallback(t *testing.T) {
	t.Run("handles simple table data", func(t *testing.T) {
		data := pterm.TableData{
			{"Header1", "Header2", "Header3", "Header4", "Header5"},
			{"Row1Col1", "Row1Col2", "Row1Col3", "Row1Col4", "Row1Col5"},
			{"Row2Col1", "Row2Col2", "Row2Col3", "Row2Col4", "Row2Col5"},
		}
		
		err := RenderTableWithFallback(data, true)
		assert.NoError(t, err)
	})
	
	t.Run("handles table without header", func(t *testing.T) {
		data := pterm.TableData{
			{"Row1Col1", "Row1Col2", "Row1Col3", "Row1Col4", "Row1Col5"},
			{"Row2Col1", "Row2Col2", "Row2Col3", "Row2Col4", "Row2Col5"},
		}
		
		err := RenderTableWithFallback(data, false)
		assert.NoError(t, err)
	})
	
	t.Run("handles rows with fewer than 5 columns", func(t *testing.T) {
		data := pterm.TableData{
			{"Header1", "Header2"},
			{"Row1Col1", "Row1Col2"},
		}
		
		err := RenderTableWithFallback(data, true)
		assert.NoError(t, err)
	})
	
	t.Run("handles empty table data", func(t *testing.T) {
		data := pterm.TableData{}
		
		err := RenderTableWithFallback(data, true)
		assert.NoError(t, err)
	})
}

func TestRenderOverviewTable(t *testing.T) {
	t.Run("handles overview table data", func(t *testing.T) {
		data := pterm.TableData{
			{"Property", "Value"},
			{"Name", "test-cluster"},
			{"Type", "k3d"},
			{"Status", "running"},
		}
		
		err := RenderOverviewTable(data)
		assert.NoError(t, err)
	})
	
	t.Run("handles table without header", func(t *testing.T) {
		data := pterm.TableData{
			{"Name", "test-cluster"},
			{"Type", "k3d"},
		}
		
		err := RenderOverviewTable(data)
		assert.NoError(t, err)
	})
	
	t.Run("handles rows with fewer than 2 columns", func(t *testing.T) {
		data := pterm.TableData{
			{"Property", "Value"},
			{"Name"},
		}
		
		err := RenderOverviewTable(data)
		assert.NoError(t, err)
	})
	
	t.Run("handles empty table data", func(t *testing.T) {
		data := pterm.TableData{}
		
		err := RenderOverviewTable(data)
		assert.NoError(t, err)
	})
}

func TestRenderNodeTable(t *testing.T) {
	t.Run("handles node table data", func(t *testing.T) {
		data := pterm.TableData{
			{"NAME", "ROLE", "STATUS", "AGE"},
			{"node1", "control-plane", "ready", "5m"},
			{"node2", "worker", "ready", "4m"},
		}
		
		err := RenderNodeTable(data)
		assert.NoError(t, err)
	})
	
	t.Run("handles table without header", func(t *testing.T) {
		data := pterm.TableData{
			{"node1", "control-plane", "ready", "5m"},
			{"node2", "worker", "ready", "4m"},
		}
		
		err := RenderNodeTable(data)
		assert.NoError(t, err)
	})
	
	t.Run("handles rows with fewer than 4 columns", func(t *testing.T) {
		data := pterm.TableData{
			{"NAME", "ROLE", "STATUS", "AGE"},
			{"node1", "control-plane"},
		}
		
		err := RenderNodeTable(data)
		assert.NoError(t, err)
	})
	
	t.Run("handles empty table data", func(t *testing.T) {
		data := pterm.TableData{}
		
		err := RenderNodeTable(data)
		assert.NoError(t, err)
	})
}

func TestShowSuccessBox(t *testing.T) {
	t.Run("displays success box", func(t *testing.T) {
		// This function primarily uses pterm for output, so we just ensure it doesn't panic
		assert.NotPanics(t, func() {
			ShowSuccessBox("Success", "Operation completed successfully")
		})
	})
	
	t.Run("handles empty title and content", func(t *testing.T) {
		assert.NotPanics(t, func() {
			ShowSuccessBox("", "")
		})
	})
}

func TestFormatAge(t *testing.T) {
	t.Run("returns unknown for zero time", func(t *testing.T) {
		result := FormatAge(time.Time{})
		assert.Equal(t, "unknown", result)
	})
	
	t.Run("formats days correctly", func(t *testing.T) {
		pastTime := time.Now().Add(-25 * time.Hour) // More than 1 day
		result := FormatAge(pastTime)
		assert.Equal(t, "1d", result)
	})
	
	t.Run("formats hours correctly", func(t *testing.T) {
		pastTime := time.Now().Add(-2 * time.Hour)
		result := FormatAge(pastTime)
		assert.Equal(t, "2h", result)
	})
	
	t.Run("formats minutes correctly", func(t *testing.T) {
		pastTime := time.Now().Add(-30 * time.Minute)
		result := FormatAge(pastTime)
		assert.Equal(t, "30m", result)
	})
	
	t.Run("formats seconds correctly", func(t *testing.T) {
		pastTime := time.Now().Add(-45 * time.Second)
		result := FormatAge(pastTime)
		assert.Equal(t, "45s", result)
	})
	
	t.Run("handles multiple days", func(t *testing.T) {
		pastTime := time.Now().Add(-3*24*time.Hour - 5*time.Hour) // 3 days and 5 hours
		result := FormatAge(pastTime)
		assert.Equal(t, "3d", result)
	})
	
	t.Run("handles exact hour boundary", func(t *testing.T) {
		pastTime := time.Now().Add(-1 * time.Hour)
		result := FormatAge(pastTime)
		assert.Equal(t, "1h", result)
	})
	
	t.Run("handles exact minute boundary", func(t *testing.T) {
		pastTime := time.Now().Add(-1 * time.Minute)
		result := FormatAge(pastTime)
		assert.Equal(t, "1m", result)
	})
	
	t.Run("handles very recent time", func(t *testing.T) {
		pastTime := time.Now().Add(-5 * time.Second)
		result := FormatAge(pastTime)
		assert.Equal(t, "5s", result)
	})
}

func TestShowClusterCreationNextSteps(t *testing.T) {
	t.Run("displays next steps without panicking", func(t *testing.T) {
		assert.NotPanics(t, func() {
			ShowClusterCreationNextSteps("test-cluster")
		})
	})
	
	t.Run("handles empty cluster name", func(t *testing.T) {
		assert.NotPanics(t, func() {
			ShowClusterCreationNextSteps("")
		})
	})
}

func TestShowNoResourcesMessage(t *testing.T) {
	ui := NewOperationsUI()
	
	t.Run("displays no resources message without panicking", func(t *testing.T) {
		assert.NotPanics(t, func() {
			ui.ShowNoResourcesMessage("clusters", "create")
		})
	})
	
	t.Run("handles empty parameters", func(t *testing.T) {
		assert.NotPanics(t, func() {
			ui.ShowNoResourcesMessage("", "")
		})
	})
	
	t.Run("handles plural resource type", func(t *testing.T) {
		assert.NotPanics(t, func() {
			ui.ShowNoResourcesMessage("applications", "deploy")
		})
	})
}