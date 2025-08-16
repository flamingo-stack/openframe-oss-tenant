package common

import (
	"github.com/spf13/cobra"
)

// Command defines a generic interface for CLI commands
type Command interface {
	// GetCommand returns the cobra command definition
	GetCommand() *cobra.Command
	
	// ValidateArgs validates command arguments
	ValidateArgs(args []string) error
}

// BaseCommand provides common functionality for commands
type BaseCommand struct {
	Name      string
	Use       string
	Short     string
	Long      string
	Aliases   []string
	MaxArgs   int
	ExactArgs int
}

// CommandFlags defines common flag patterns for commands
type CommandFlags struct {
	Force   bool
	Verbose bool
	DryRun  bool
	Quiet   bool
}