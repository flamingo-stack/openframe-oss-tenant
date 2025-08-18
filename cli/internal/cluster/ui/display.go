package ui

import (
	"fmt"
	"time"

	commonUI "github.com/flamingo/openframe/internal/common/ui"
	"github.com/pterm/pterm"
)

// GetStatusColor returns appropriate color function for status
// Deprecated: Use commonUI.GetStatusColor instead
func GetStatusColor(status string) func(string) string {
	return commonUI.GetStatusColor(status)
}

// RenderTableWithFallback renders a table with fallback to simple output
// Deprecated: Use commonUI.RenderTableWithFallback instead
func RenderTableWithFallback(data pterm.TableData, hasHeader bool) error {
	return commonUI.RenderTableWithFallback(data, hasHeader)
}

// RenderOverviewTable renders cluster overview information
func RenderOverviewTable(data pterm.TableData) error {
	return commonUI.RenderKeyValueTable(data)
}

// RenderNodeTable renders node information table
func RenderNodeTable(data pterm.TableData) error {
	return commonUI.RenderNodeTable(data)
}

// ShowSuccessBox displays a success message in a formatted box
// Deprecated: Use commonUI.ShowSuccessBox instead
func ShowSuccessBox(title, content string) {
	commonUI.ShowSuccessBox(title, content)
}

// FormatAge formats a time duration into a human-readable age string
// Deprecated: Use commonUI.FormatAge instead
func FormatAge(createdAt time.Time) string {
	return commonUI.FormatAge(createdAt)
}

// ShowClusterCreationNextSteps displays next steps after cluster creation
func ShowClusterCreationNextSteps(clusterName string) {
	fmt.Println()
	
	// Create table data for next steps
	tableData := pterm.TableData{
		{"STEP", "Next Steps"},
		{"1.", pterm.Gray("Bootstrap OpenFrame:  ") + pterm.Cyan("openframe bootstrap")},
		{"2.", pterm.Gray("Check cluster status: ") + pterm.Cyan("openframe cluster status")},
		{"3.", pterm.Gray("List all clusters:    ") + pterm.Cyan("openframe cluster list")},
		{"4.", pterm.Gray("Access with kubectl:  ") + pterm.Cyan("kubectl get nodes")},
	}
	
	// Try to render as table, fallback to simple output
	if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
		// Fallback to simple output
		fmt.Println("Next steps:")
		fmt.Printf("  1. Bootstrap OpenFrame:  %s\n", pterm.Cyan("openframe bootstrap"))
		fmt.Printf("  2. Check cluster status: %s\n", pterm.Cyan("openframe cluster status"))
		fmt.Printf("  3. List all clusters:    %s\n", pterm.Cyan("openframe cluster list"))
		fmt.Printf("  4. Access with kubectl:  %s\n", pterm.Cyan("kubectl get nodes"))
	}
	fmt.Println()
}

