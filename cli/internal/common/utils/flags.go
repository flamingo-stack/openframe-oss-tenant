package utils

import (
	"github.com/spf13/cobra"
)

// GlobalFlags contains common global flags used across commands
type GlobalFlags struct {
	Verbose bool
	DryRun  bool
	Force   bool
}

// FlagManager handles consistent flag setup across commands
type FlagManager struct {
	global *GlobalFlags
}

// NewFlagManager creates a new flag manager
func NewFlagManager(global *GlobalFlags) *FlagManager {
	return &FlagManager{global: global}
}

// AddGlobalFlags adds global flags to a command
func (fm *FlagManager) AddGlobalFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().BoolVarP(&fm.global.Verbose, "verbose", "v", false, "Enable verbose output")
	cmd.PersistentFlags().BoolVarP(&fm.global.Force, "force", "f", false, "Skip confirmation prompts")
}

// ValidateGlobalFlags validates global flag combinations
func ValidateGlobalFlags(flags *GlobalFlags) error {
	// Add validation logic for global flags if needed
	return nil
}

// GetFlagDescription returns a standard description for common flags
func GetFlagDescription(flagName string) string {
	descriptions := map[string]string{
		"verbose": "Enable verbose output with detailed information",
		"dry-run": "Show what would be done without actually executing",
		"force":   "Skip confirmation prompts and proceed automatically",
		"quiet":   "Minimize output, showing only essential information",
	}
	
	if desc, exists := descriptions[flagName]; exists {
		return desc
	}
	return ""
}