package models

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/flags"
	"github.com/spf13/cobra"
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
	Force bool // Delete-specific force flag
}

// CleanupFlags contains flags specific to cleanup command
type CleanupFlags struct {
	GlobalFlags
	Force bool // Cleanup-specific force flag
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

// AddCleanupFlags adds cleanup-specific flags to a command
func AddCleanupFlags(cmd *cobra.Command, flags *CleanupFlags) {
	cmd.Flags().BoolVarP(&flags.Force, "force", "f", false, "Enable aggressive cleanup (remove all images, volumes, networks)")
}

// ValidateClusterName validates cluster name according to Kubernetes naming conventions
func ValidateClusterName(name string) error {
	// Trim whitespace and check if empty after trimming
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return fmt.Errorf("cluster name cannot be empty or contain only whitespace")
	}

	// Check length (DNS-1123 subdomain: max 253 characters, but k3d has stricter limits)
	if len(trimmed) > 63 {
		return fmt.Errorf("cluster name is too long: %d characters (max 63)", len(trimmed))
	}

	// Check minimum length
	if len(trimmed) < 1 {
		return fmt.Errorf("cluster name must be at least 1 character")
	}

	// Check for invalid characters (DNS-1123 subdomain rules, but allow uppercase)
	// Must contain only alphanumeric characters or '-'
	// Must start and end with an alphanumeric character
	// Single character names are allowed if they are alphanumeric
	if len(trimmed) == 1 {
		if !regexp.MustCompile(`^[a-zA-Z0-9]$`).MatchString(trimmed) {
			return fmt.Errorf("cluster name '%s' is invalid: must be an alphanumeric character", trimmed)
		}
	} else {
		if !regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$`).MatchString(trimmed) {
			return fmt.Errorf("cluster name '%s' is invalid: must contain only letters, numbers, and hyphens, and must start and end with an alphanumeric character", trimmed)
		}
	}

	return nil
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

	// Validate node count - this validation is now handled at command level
	// to distinguish between explicitly set values and defaults
	if flags.NodeCount <= 0 {
		return fmt.Errorf("node count must be at least 1: %d", flags.NodeCount)
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

// ValidateCleanupFlags validates cleanup flag combinations
func ValidateCleanupFlags(flags *CleanupFlags) error {
	return ValidateGlobalFlags(&flags.GlobalFlags)
}
