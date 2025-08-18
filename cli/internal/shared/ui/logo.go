package ui

import (
	"fmt"
	"os"
	"strings"
	
	"github.com/pterm/pterm"
)

const (
	// Logo configuration constants
	logoTitle        = "OpenFrame Platform Bootstrapper"
	borderChar       = "━"
	topLeftCorner    = "┏"
	topRightCorner   = "┖"
	bottomLeftCorner = "┗"
	bottomRightCorner = "┛"
	verticalChar     = "┃"
	borderLength     = 84
	logoLeftPadding  = 2
)

var (
	// TestMode suppresses logo output during testing
	TestMode bool
	
	// logoArt contains the beautiful Unicode logo for OpenFrame
	logoArt = []string{
		" ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██████╗  █████╗ ███╗   ███╗███████╗",
		"██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝",
		"██║   ██║██████╔╝█████╗  ██╔██╗ ██║█████╗  ██████╔╝███████║██╔████╔██║█████╗  ",
		"██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ",
		"╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗",
		" ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝",
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
		// Auto-detect: use fancy only for truly interactive terminals with color support
		useFancy = isTerminalEnvironment() && pterm.PrintColor && os.Getenv("TERM") != "" && os.Getenv("NO_COLOR") == ""
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
	// Create custom box style with gradient colors
	boxStyle := pterm.NewStyle(pterm.FgCyan, pterm.Bold)
	titleStyle := pterm.NewStyle(pterm.FgLightCyan, pterm.Bold)
	
	// Use pterm default box with custom styling
	pterm.DefaultBox.BoxStyle = boxStyle
	
	// Create padded logo lines
	paddedLines := make([]string, 0, len(logoArt)+3)
	paddedLines = append(paddedLines, "") // Top padding
	for _, line := range logoArt {
		paddedLines = append(paddedLines, " " + line + " ")
	}
	paddedLines = append(paddedLines, "") // Bottom padding
	
	logo := strings.Join(paddedLines, "\n")
	
	// Create styled title
	styledTitle := titleStyle.Sprint(" " + logoTitle + " ")
	
	pterm.DefaultBox.WithTitle(styledTitle).
		WithTitleTopCenter().
		WithBoxStyle(boxStyle).
		Println(logo)
	
	// Add a subtle separator after the logo
	fmt.Println()
}

// showPlainLogo displays a simple plain text logo for non-terminal environments
func showPlainLogo() {
	// Create a more sophisticated box design
	logoVisualWidth := 84
	
	// Build top border with title
	topBorder := topLeftCorner + strings.Repeat(borderChar, 25) + "┫ " + logoTitle + " ┣" + strings.Repeat(borderChar, 26) + topRightCorner
	
	// Build middle separator
	middleSeparator := verticalChar + strings.Repeat("─", logoVisualWidth-2) + verticalChar
	
	// Build bottom border
	bottomBorder := bottomLeftCorner + strings.Repeat(borderChar, logoVisualWidth-2) + bottomRightCorner
	
	// Print the logo with improved formatting
	fmt.Println(topBorder)
	fmt.Println(middleSeparator)
	
	// Display logo art with proper padding
	for _, line := range logoArt {
		fmt.Printf("%s %s %s\n", verticalChar, line, verticalChar)
	}
	
	fmt.Println(middleSeparator)
	fmt.Println(bottomBorder)
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