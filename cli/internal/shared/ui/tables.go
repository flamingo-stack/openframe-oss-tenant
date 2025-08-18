package ui

import (
	"fmt"
	"strings"

	"github.com/pterm/pterm"
)

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

// RenderKeyValueTable renders table data in key-value format with fallback
func RenderKeyValueTable(data pterm.TableData) error {
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

// RenderNodeTable renders node information table with fallback
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

// ShowSuccessBox displays a success message in a formatted box
func ShowSuccessBox(title, content string) {
	pterm.DefaultBox.WithTitle(title).
		WithTitleTopCenter().
		Println(content)
}