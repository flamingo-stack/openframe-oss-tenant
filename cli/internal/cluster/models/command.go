package models

import (
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/spf13/cobra"
)

// CommandFlags represents the minimum interface for command flags
type CommandFlags interface {
	// GetGlobal returns the global flags
	GetGlobal() *GlobalFlags
}

// CommandExecutor represents the execution context for cluster commands
type CommandExecutor interface {
	// GetExecutor returns the command executor
	GetExecutor() executor.CommandExecutor
}

// ClusterCommand defines the interface that all cluster commands must implement
type ClusterCommand interface {
	// GetCommand returns the cobra command
	GetCommand(flags CommandFlags) *cobra.Command

	// Execute runs the command logic
	Execute(cmd *cobra.Command, args []string, flags CommandFlags, executor CommandExecutor) error

	// ValidateFlags validates command-specific flags
	ValidateFlags(flags CommandFlags) error

	// SetupFlags configures command-specific flags
	SetupFlags(cmd *cobra.Command, flags CommandFlags)
}
