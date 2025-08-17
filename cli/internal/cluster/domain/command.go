package domain

import (
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/internal/common/utils"
)

// Re-export common types to avoid duplication
type CommandExecutor = utils.CommandExecutor
type CommandResult = utils.CommandResult
type ExecuteOptions = utils.ExecuteOptions

// ClusterCommand defines the interface that all cluster commands must implement
type ClusterCommand interface {
	// GetCommand returns the cobra command
	GetCommand(*FlagContainer) *cobra.Command
	
	// Execute runs the command logic
	Execute(cmd *cobra.Command, args []string, flags *FlagContainer) error
	
	// ValidateFlags validates command-specific flags
	ValidateFlags(flags *FlagContainer) error
	
	// SetupFlags configures command-specific flags
	SetupFlags(cmd *cobra.Command, flags *FlagContainer)
}