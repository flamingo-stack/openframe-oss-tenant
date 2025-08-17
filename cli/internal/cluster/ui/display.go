package ui

import (
	"fmt"
	"strings"
	"time"

	"github.com/pterm/pterm"
)

// GetStatusColor returns appropriate color function for status
func GetStatusColor(status string) func(string) string {
	switch strings.ToLower(status) {
	case "running", "ready":
		return func(s string) string { return pterm.Green(s) }
	case "stopped", "not ready", "pending":
		return func(s string) string { return pterm.Yellow(s) }
	case "error", "failed", "unhealthy":
		return func(s string) string { return pterm.Red(s) }
	default:
		return func(s string) string { return pterm.Gray(s) }
	}
}

// RenderTableWithFallback renders a table with fallback to simple output
func RenderTableWithFallback(data pterm.TableData, hasHeader bool) error {
	if err := pterm.DefaultTable.WithHasHeader(hasHeader).WithData(data).Render(); err != nil {
		// Fallback to simple output for the specific 5-column layout used in cluster commands
		for i, row := range data {
			if i == 0 && hasHeader {
				fmt.Printf("%-20s %-10s %-12s %-8s %-10s\n", row[0], row[1], row[2], row[3], row[4])
				fmt.Println(strings.Repeat("─", 70))
			} else if len(row) >= 5 {
				fmt.Printf("%-20s %-10s %-12s %-8s %-10s\n", row[0], row[1], row[2], row[3], row[4])
			}
		}
	}
	return nil
}

// RenderOverviewTable renders cluster overview information
func RenderOverviewTable(data pterm.TableData) error {
	if err := pterm.DefaultTable.WithHasHeader().WithData(data).Render(); err != nil {
		// Fallback to simple key-value output
		for i, row := range data {
			if i == 0 {
				continue // Skip header
			}
			if len(row) >= 2 {
				fmt.Printf("%s: %s\n", row[0], row[1])
			}
		}
	}
	return nil
}

// RenderNodeTable renders node information table
func RenderNodeTable(data pterm.TableData) error {
	if err := pterm.DefaultTable.WithHasHeader().WithData(data).Render(); err != nil {
		// Fallback to simple output
		fmt.Printf("%-40s | %-13s | %-10s | %s\n", "NAME", "ROLE", "STATUS", "AGE")
		fmt.Println(strings.Repeat("-", 80))
		for i, row := range data {
			if i == 0 {
				continue // Skip header
			}
			if len(row) >= 4 {
				fmt.Printf("%-40s | %-13s | %-10s | %s\n", row[0], row[1], row[2], row[3])
			}
		}
	}
	return nil
}

// ShowSuccessBox displays a success message in a formatted box
func ShowSuccessBox(title, content string) {
	pterm.DefaultBox.WithTitle(title).
		WithTitleTopCenter().
		Println(content)
}

// FormatAge formats a time duration into a human-readable age string
func FormatAge(createdAt time.Time) string {
	if createdAt.IsZero() {
		return "unknown"
	}
	
	duration := time.Since(createdAt)
	
	days := int(duration.Hours() / 24)
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60
	seconds := int(duration.Seconds()) % 60
	
	if days > 0 {
		return fmt.Sprintf("%dd", days)
	} else if hours > 0 {
		return fmt.Sprintf("%dh", hours)
	} else if minutes > 0 {
		return fmt.Sprintf("%dm", minutes)
	} else {
		return fmt.Sprintf("%ds", seconds)
	}
}

// ShowClusterCreationNextSteps displays next steps after cluster creation
func ShowClusterCreationNextSteps(clusterName string) {
	fmt.Printf("\nNext steps:\n")
	fmt.Printf("  • Use 'openframe bootstrap' to install OpenFrame components\n")
	fmt.Printf("  • Check cluster status: openframe cluster status\n")
	fmt.Printf("  • Access cluster: kubectl get nodes\n")
}

// ShowNoResourcesMessage displays a message when no resources are found
func ShowNoResourcesMessage(resourceType, command string) {
	pterm.Info.Printf("No %s found.\n", resourceType)
	pterm.Println()
	pterm.Printf("To create a new %s, run:\n", strings.TrimSuffix(resourceType, "s"))
	pterm.Printf("  %s\n", pterm.Green(command))
}