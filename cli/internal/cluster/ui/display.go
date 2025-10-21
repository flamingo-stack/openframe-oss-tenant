package ui

import (
	"fmt"
	"time"

	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// GetStatusColor returns appropriate color function for status
// Deprecated: Use sharedUI.GetStatusColor instead
func GetStatusColor(status string) func(string) string {
	return sharedUI.GetStatusColor(status)
}

// RenderTableWithFallback renders a table with fallback to simple output
// Deprecated: Use sharedUI.RenderTableWithFallback instead
func RenderTableWithFallback(data pterm.TableData, hasHeader bool) error {
	return sharedUI.RenderTableWithFallback(data, hasHeader)
}

// RenderOverviewTable renders cluster overview information
func RenderOverviewTable(data pterm.TableData) error {
	return sharedUI.RenderKeyValueTable(data)
}

// RenderNodeTable renders node information table
func RenderNodeTable(data pterm.TableData) error {
	return sharedUI.RenderNodeTable(data)
}

// ShowSuccessBox displays a success message in a formatted box
// Deprecated: Use sharedUI.ShowSuccessBox instead
func ShowSuccessBox(title, content string) {
	sharedUI.ShowSuccessBox(title, content)
}

// FormatAge formats a time duration into a human-readable age string
// Deprecated: Use sharedUI.FormatAge instead
func FormatAge(createdAt time.Time) string {
	return sharedUI.FormatAge(createdAt)
}

// ShowClusterCreationNextSteps displays next steps after cluster creation
func ShowClusterCreationNextSteps(clusterName string) {
	fmt.Println()

	// Create table data for next steps
	tableData := pterm.TableData{
		{pterm.Gray("Bootstrap OpenFrame:  ") + pterm.Cyan("openframe bootstrap")},
		{pterm.Gray("Check cluster status: ") + pterm.Cyan("openframe cluster status")},
		{pterm.Gray("List all clusters:    ") + pterm.Cyan("openframe cluster list")},
		{pterm.Gray("Access with kubectl:  ") + pterm.Cyan("kubectl get nodes")},
	}

	pterm.Info.Println("Next Steps:")
	// Try to render as table, fallback to simple output
	if err := pterm.DefaultTable.WithData(tableData).Render(); err != nil {
		// Fallback to simple output
		fmt.Println("Next steps:")
		fmt.Printf("  Bootstrap OpenFrame:  %s\n", pterm.Cyan("openframe bootstrap"))
		fmt.Printf("  Check cluster status: %s\n", pterm.Cyan("openframe cluster status"))
		fmt.Printf("  List all clusters:    %s\n", pterm.Cyan("openframe cluster list"))
		fmt.Printf("  Access with kubectl:  %s\n", pterm.Cyan("kubectl get nodes"))
	}
	fmt.Println()
}
