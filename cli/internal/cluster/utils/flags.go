package utils

import (
	"github.com/spf13/cobra"
)

// GlobalFlags contains all global flags used across cluster commands
type GlobalFlags struct {
	Verbose bool
	DryRun  bool
	Force   bool
}

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

// FlagManager handles consistent flag setup across cluster commands
type FlagManager struct {
	global *GlobalFlags
}

// NewFlagManager creates a new flag manager for cluster commands
func NewFlagManager(global *GlobalFlags) *FlagManager {
	return &FlagManager{global: global}
}

// AddGlobalFlags adds global flags to a cluster command
func (fm *FlagManager) AddGlobalFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().BoolVarP(&fm.global.Verbose, "verbose", "v", false, "Enable verbose output")
	cmd.PersistentFlags().BoolVarP(&fm.global.Force, "force", "f", false, "Skip confirmation prompts")
}

// AddCreateFlags adds create-specific flags to a command
func AddCreateFlags(cmd *cobra.Command, flags *CreateFlags) {
	cmd.Flags().StringVarP(&flags.ClusterType, "type", "t", "", "Cluster type (k3d, gke, eks)")
	cmd.Flags().IntVarP(&flags.NodeCount, "nodes", "n", 3, "Number of worker nodes (default 3)")
	cmd.Flags().StringVar(&flags.K8sVersion, "version", "", "Kubernetes version")
	cmd.Flags().BoolVar(&flags.SkipWizard, "skip-wizard", false, "Skip interactive wizard")
	cmd.Flags().BoolVar(&flags.DryRun, "dry-run", false, "Dry run mode")
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

// ValidateGlobalFlags validates global flag combinations
func ValidateGlobalFlags(flags *GlobalFlags) error {
	// Add validation logic for global flags if needed
	return nil
}

// ValidateCreateFlags validates create flag combinations
func ValidateCreateFlags(flags *CreateFlags) error {
	if err := ValidateGlobalFlags(&flags.GlobalFlags); err != nil {
		return err
	}
	
	// Validate node count
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