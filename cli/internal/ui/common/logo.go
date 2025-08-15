package common

import (
	"fmt"
	"strings"
	
	"github.com/pterm/pterm"
)

// ShowLogo displays the OpenFrame ASCII logo
func ShowLogo() {
	// Create properly padded logo lines to ensure consistent centering
	logoLines := []string{
		"",
		"   ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██████╗  █████╗ ███╗   ███╗███████╗",
		"  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝",
		"  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║█████╗  ██████╔╝███████║██╔████╔██║█████╗  ",
		"  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ",
		"  ╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗",
		"   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝",
		"",
	}
	
	// Find the maximum line length for proper centering
	maxLength := 0
	for _, line := range logoLines {
		if len(line) > maxLength {
			maxLength = len(line)
		}
	}
	
	// Center each line within the maximum width
	centeredLines := make([]string, len(logoLines))
	for i, line := range logoLines {
		padding := (maxLength - len(line)) / 2
		centeredLines[i] = fmt.Sprintf("%*s%s", padding, "", line)
	}
	
	logo := strings.Join(centeredLines, "\n")

	pterm.DefaultBox.WithTitle("OpenFrame Platform Bootstrapper").
		WithTitleTopCenter().
		WithBoxStyle(pterm.NewStyle(pterm.FgCyan)).
		Println(logo)
}