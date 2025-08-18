package domain

import (
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe/internal/shared/flags"
)

// Use CommonFlags from internal/shared/flags as the single source of truth
type GlobalFlags = flags.CommonFlags

// InstallFlags contains flags specific to install command
type InstallFlags struct {
	GlobalFlags
	Force  bool
	DryRun bool
}

// AddGlobalFlags adds global flags to a chart command
func AddGlobalFlags(cmd *cobra.Command, global *GlobalFlags) {
	flagManager := flags.NewFlagManager(global)
	flagManager.AddCommonFlags(cmd)
}

// AddInstallFlags adds install-specific flags to a command
func AddInstallFlags(cmd *cobra.Command, flags *InstallFlags) {
	cmd.Flags().BoolVarP(&flags.Force, "force", "f", false, "Force installation even if charts already exist")
	cmd.Flags().BoolVar(&flags.DryRun, "dry-run", false, "Show what would be installed without executing")
}