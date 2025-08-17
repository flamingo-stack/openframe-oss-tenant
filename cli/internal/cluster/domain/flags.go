package domain

import "github.com/spf13/cobra"

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

// FlagContainer holds all flag structures needed by cluster commands
type FlagContainer struct {
	Global  *GlobalFlags
	Create  *CreateFlags
	List    *ListFlags
	Status  *StatusFlags
	Delete  *DeleteFlags
	Start   *StartFlags
	Cleanup *CleanupFlags
	
	// TestManager is used for dependency injection in tests
	TestManager interface{}
	
	// Executor is used for dependency injection of command execution
	Executor CommandExecutor
}

// NewFlagContainer creates a new flag container with initialized flags
func NewFlagContainer() *FlagContainer {
	global := &GlobalFlags{}
	return &FlagContainer{
		Global:  global,
		Create:  &CreateFlags{GlobalFlags: *global},
		List:    &ListFlags{GlobalFlags: *global},
		Status:  &StatusFlags{GlobalFlags: *global},
		Delete:  &DeleteFlags{GlobalFlags: *global},
		Start:   &StartFlags{GlobalFlags: *global},
		Cleanup: &CleanupFlags{GlobalFlags: *global},
	}
}

// SyncGlobalFlags synchronizes global flags to all command-specific flag structures
func (f *FlagContainer) SyncGlobalFlags() {
	if f.Global != nil {
		f.Create.GlobalFlags = *f.Global
		f.List.GlobalFlags = *f.Global
		f.Status.GlobalFlags = *f.Global
		f.Delete.GlobalFlags = *f.Global
		f.Start.GlobalFlags = *f.Global
		f.Cleanup.GlobalFlags = *f.Global
	}
}

// Reset resets all flags to their default values
func (f *FlagContainer) Reset() {
	global := &GlobalFlags{}
	f.Global = global
	f.Create = &CreateFlags{GlobalFlags: *global}
	f.List = &ListFlags{GlobalFlags: *global}
	f.Status = &StatusFlags{GlobalFlags: *global}
	f.Delete = &DeleteFlags{GlobalFlags: *global}
	f.Start = &StartFlags{GlobalFlags: *global}
	f.Cleanup = &CleanupFlags{GlobalFlags: *global}
	f.TestManager = nil
	f.Executor = nil
}

// Flag setup functions

// AddGlobalFlags adds global flags to a cluster command
func AddGlobalFlags(cmd *cobra.Command, global *GlobalFlags) {
	cmd.PersistentFlags().BoolVarP(&global.Verbose, "verbose", "v", false, "Enable verbose output")
	cmd.PersistentFlags().BoolVar(&global.DryRun, "dry-run", false, "Show what would be done without executing")
}

// AddCreateFlags adds create-specific flags to a command
func AddCreateFlags(cmd *cobra.Command, flags *CreateFlags) {
	cmd.Flags().StringVarP(&flags.ClusterType, "type", "t", "", "Cluster type (k3d, gke, eks)")
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
func ValidateGlobalFlags(flags *GlobalFlags) error {
	return nil
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