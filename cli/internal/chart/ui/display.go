package ui

import (
	"fmt"
	"io"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/pterm/pterm"
)

// DisplayService handles chart-related UI display operations
type DisplayService struct{}

// NewDisplayService creates a new display service
func NewDisplayService() *DisplayService {
	return &DisplayService{}
}

// ShowInstallProgress displays installation progress
func (d *DisplayService) ShowInstallProgress(chartType models.ChartType, message string) {
	// Use specific icons for different chart types
	var icon string
	switch chartType {
	case models.ChartTypeArgoCD:
		icon = "🚀" // ArgoCD rocket icon for GitOps deployment
	case models.ChartTypeAppOfApps:
		icon = "📦" // App-of-apps package icon
	default:
		icon = "📦"
	}
	pterm.Info.Printf("%s %s\n", icon, message)
}

// ShowInstallSuccess displays successful installation
func (d *DisplayService) ShowInstallSuccess(chartType models.ChartType, info models.ChartInfo) {
	// Simple success message without box - will be called but not used for display
	// The actual success message is shown in the service layer
}

// ShowInstallError displays installation error
func (d *DisplayService) ShowInstallError(chartType models.ChartType, err error) {
	pterm.Error.Printf("Failed to install %s: %v\n", string(chartType), err)
}

// ShowSkippedInstallation displays when installation is skipped
func (d *DisplayService) ShowSkippedInstallation(component, reason string) {
	pterm.Success.Printf("✅ %s installation skipped - %s\n", component, reason)
}

// ShowPreInstallCheck displays pre-installation checks
func (d *DisplayService) ShowPreInstallCheck(message string) {
	pterm.Info.Printf("🔍 %s\n", message)
}

// ShowDryRunResults displays dry-run results
func (d *DisplayService) ShowDryRunResults(w io.Writer, results []string) {
	fmt.Fprintln(w)
	pterm.Info.Println("📋 Dry Run Results:")
	for _, result := range results {
		fmt.Fprintf(w, "  %s\n", result)
	}
}

// getChartDisplayName returns a user-friendly display name for chart types
func (d *DisplayService) getChartDisplayName(chartType models.ChartType) string {
	switch chartType {
	case models.ChartTypeArgoCD:
		return "ArgoCD"
	case models.ChartTypeAppOfApps:
		return "App-of-Apps"
	default:
		return string(chartType)
	}
}
