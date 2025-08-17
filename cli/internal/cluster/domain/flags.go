package domain

import (
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe/internal/common/flags"
)

// Use CommonFlags from internal/common as the single source of truth
type GlobalFlags = flags.CommonFlags

// CreateFlags contains flags specific to create command
type CreateFlags struct {
	GlobalFlags
	ClusterType string
	NodeCount   int
	K8sVersion  string
	SkipWizard  bool
}

// ListFlags contains flags specific to list command
type ListFlags struct {
	GlobalFlags
	Quiet bool
}

// StatusFlags contains flags specific to status command
type StatusFlags struct {
	GlobalFlags
	Detailed bool
	NoApps   bool
}

// DeleteFlags contains flags specific to delete command
type DeleteFlags struct {
	GlobalFlags
}

// StartFlags contains flags specific to start command
type StartFlags struct {
	GlobalFlags
}

// CleanupFlags contains flags specific to cleanup command
type CleanupFlags struct {
	GlobalFlags
}

// Flag setup functions

// AddGlobalFlags adds global flags to a cluster command
func AddGlobalFlags(cmd *cobra.Command, global *GlobalFlags) {
	flagManager := flags.NewFlagManager(global)
	flagManager.AddCommonFlags(cmd)
}

// AddCreateFlags adds create-specific flags to a command
func AddCreateFlags(cmd *cobra.Command, flags *CreateFlags) {
	cmd.Flags().StringVarP(&flags.ClusterType, "type", "t", "", "Cluster type (k3d, gke)")
	cmd.Flags().IntVarP(&flags.NodeCount, "nodes", "n", 3, "Number of worker nodes (default 3)")
	cmd.Flags().StringVar(&flags.K8sVersion, "version", "", "Kubernetes version")
	cmd.Flags().BoolVar(&flags.SkipWizard, "skip-wizard", false, "Skip interactive wizard")
}

// AddListFlags adds list-specific flags to a command
func AddListFlags(cmd *cobra.Command, flags *ListFlags) {
	cmd.Flags().BoolVarP(&flags.Quiet, "quiet", "q", false, "Only show cluster names")
}

// AddStatusFlags adds status-specific flags to a command
func AddStatusFlags(cmd *cobra.Command, flags *StatusFlags) {
	cmd.Flags().BoolVarP(&flags.Detailed, "detailed", "d", false, "Show detailed resource information")
	cmd.Flags().BoolVar(&flags.NoApps, "no-apps", false, "Skip application status checking")
}

// AddDeleteFlags adds delete-specific flags to a command
func AddDeleteFlags(cmd *cobra.Command, flags *DeleteFlags) {
	cmd.Flags().BoolVarP(&flags.Force, "force", "f", false, "Skip confirmation prompt")
}

// AddStartFlags adds start-specific flags to a command
func AddStartFlags(cmd *cobra.Command, flags *StartFlags) {
	// Start command has no specific flags
}

// AddCleanupFlags adds cleanup-specific flags to a command
func AddCleanupFlags(cmd *cobra.Command, flags *CleanupFlags) {
	// Cleanup command has no specific flags
}

// Flag validation functions

// ValidateGlobalFlags validates global flag combinations
func ValidateGlobalFlags(globalFlags *GlobalFlags) error {
	return flags.ValidateCommonFlags(globalFlags)
}

// ValidateCreateFlags validates create flag combinations
func ValidateCreateFlags(flags *CreateFlags) error {
	if err := ValidateGlobalFlags(&flags.GlobalFlags); err != nil {
		return err
	}
	
	if flags.NodeCount < 1 {
		flags.NodeCount = 3 // Default
	}
	
	return nil
}

// ValidateListFlags validates list flag combinations
func ValidateListFlags(flags *ListFlags) error {
	return ValidateGlobalFlags(&flags.GlobalFlags)
}

// ValidateStatusFlags validates status flag combinations
func ValidateStatusFlags(flags *StatusFlags) error {
	return ValidateGlobalFlags(&flags.GlobalFlags)
}

// ValidateDeleteFlags validates delete flag combinations
func ValidateDeleteFlags(flags *DeleteFlags) error {
	return ValidateGlobalFlags(&flags.GlobalFlags)
}

// ValidateStartFlags validates start flag combinations
func ValidateStartFlags(flags *StartFlags) error {
	return ValidateGlobalFlags(&flags.GlobalFlags)
}

// ValidateCleanupFlags validates cleanup flag combinations
func ValidateCleanupFlags(flags *CleanupFlags) error {
	return ValidateGlobalFlags(&flags.GlobalFlags)
}