package common

import (
	"fmt"
	"os"
	"strings"
	
	"github.com/pterm/pterm"
)

const (
	// Logo configuration constants
	logoTitle        = "OpenFrame Platform Bootstrapper"
	borderChar       = "="
	borderLength     = 80
	logoLeftPadding  = 3
)

var (
	// TestMode suppresses logo output during testing
	TestMode bool
	
	// logoArt contains the beautiful Unicode logo for OpenFrame
	logoArt = []string{
		"██████╗ ██████╗ ███████╗███╗   ██╗███████╗██████╗  █████╗ ███╗   ███╗███████╗",
		"██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝",
		"██║   ██║██████╔╝█████╗  ██╔██╗ ██║█████╗  ██████╔╝███████║██╔████╔██║█████╗  ",
		"██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ",
		"╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗",
		"╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝",
	}
)

// ShowLogo displays the OpenFrame ASCII logo
func ShowLogo() {
	if TestMode {
		return
	}
	
	// Check if we should use fancy formatting
	// Use plain logo by default to avoid escape sequence issues
	// Only use fancy logo when explicitly requested or in known good environments
	useFancy := false
	
	// Check for explicit preference
	if os.Getenv("OPENFRAME_FANCY_LOGO") == "true" {
		useFancy = true
	} else if os.Getenv("OPENFRAME_FANCY_LOGO") == "false" {
		useFancy = false
	} else {
		// Auto-detect: use fancy only for truly interactive terminals
		useFancy = isTerminalEnvironment() && pterm.PrintColor && os.Getenv("TERM") != ""
	}
	
	if useFancy {
		showFancyLogo()
	} else {
		showPlainLogo()
	}
}

// isTerminalEnvironment checks if we're running in a proper terminal
func isTerminalEnvironment() bool {
	// Check if stdout is a terminal
	if stat, err := os.Stdout.Stat(); err == nil {
		return (stat.Mode() & os.ModeCharDevice) != 0
	}
	return false
}

// showFancyLogo displays the logo using pterm for enhanced terminals
func showFancyLogo() {
	// Create padded logo lines for pterm box
	paddedLines := make([]string, len(logoArt)+2) // Add empty lines for spacing
	paddedLines[0] = ""
	for i, line := range logoArt {
		// Add consistent padding to each line
		paddedLines[i+1] = strings.Repeat(" ", logoLeftPadding) + line
	}
	paddedLines[len(paddedLines)-1] = ""
	
	logo := strings.Join(paddedLines, "\n")
	
	pterm.DefaultBox.WithTitle(logoTitle).
		WithTitleTopCenter().
		WithBoxStyle(pterm.NewStyle(pterm.FgCyan)).
		Println(logo)
}

// showPlainLogo displays a simple plain text logo for non-terminal environments
func showPlainLogo() {
	// For Unicode characters, calculate visual width properly
	// Each Unicode box-drawing character displays as 1 character width
	logoVisualWidth := 80 // The actual visual width of the logo
	
	border := strings.Repeat(borderChar, logoVisualWidth)
	title := centerText(logoTitle, logoVisualWidth)
	
	fmt.Println(border)
	fmt.Println(title)
	fmt.Println(border)
	fmt.Println()
	
	// Display logo with proper centering based on visual width
	for _, line := range logoArt {
		// Add small padding on both sides for clean appearance
		fmt.Printf("%s%s%s\n", strings.Repeat(" ", 2), line, strings.Repeat(" ", 2))
	}
	
	fmt.Println()
	fmt.Println(border)
	fmt.Println()
}

// centerText centers text within a given width
func centerText(text string, width int) string {
	if len(text) >= width {
		return text
	}
	
	padding := (width - len(text)) / 2
	rightPadding := width - len(text) - padding
	return strings.Repeat(" ", padding) + text + strings.Repeat(" ", rightPadding)
}