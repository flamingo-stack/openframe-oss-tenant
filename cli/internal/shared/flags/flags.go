package flags

import (
	"github.com/spf13/cobra"
)

// CommonFlags contains common flags for non-cluster commands
// For cluster-specific flags, use internal/cluster/domain.GlobalFlags
type CommonFlags struct {
	Verbose bool
	DryRun  bool
	Force   bool
}

// FlagManager handles consistent flag setup across commands
type FlagManager struct {
	common *CommonFlags
}

// NewFlagManager creates a new flag manager for common flags
func NewFlagManager(common *CommonFlags) *FlagManager {
	return &FlagManager{common: common}
}

// AddCommonFlags adds common flags to a command
func (fm *FlagManager) AddCommonFlags(cmd *cobra.Command) {
	if fm.common == nil {
		// If common flags are nil, create placeholder flags
		var verbose, force, dryRun bool
		cmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "Enable verbose output")
		cmd.PersistentFlags().BoolVarP(&force, "force", "f", false, "Skip confirmation prompts")
		cmd.PersistentFlags().BoolVar(&dryRun, "dry-run", false, "Show what would be done without executing")
		return
	}
	cmd.PersistentFlags().BoolVarP(&fm.common.Verbose, "verbose", "v", false, "Enable verbose output")
	cmd.PersistentFlags().BoolVarP(&fm.common.Force, "force", "f", false, "Skip confirmation prompts")
	cmd.PersistentFlags().BoolVar(&fm.common.DryRun, "dry-run", false, "Show what would be done without executing")
}

// ValidateCommonFlags validates common flag combinations
func ValidateCommonFlags(flags *CommonFlags) error {
	// Add validation logic for common flags if needed
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