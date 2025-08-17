package cmd

import (
	"fmt"
	"os"

	"github.com/flamingo/openframe/cmd/cluster"
	"github.com/flamingo/openframe/internal/common/config"
	"github.com/spf13/cobra"
)

// VersionInfo holds version information for the CLI
type VersionInfo struct {
	Version string
	Commit  string
	Date    string
}

// DefaultVersionInfo provides default version information
var DefaultVersionInfo = VersionInfo{
	Version: "dev",
	Commit:  "none", 
	Date:    "unknown",
}

// GetRootCmd returns the root command following cluster command pattern
func GetRootCmd(versionInfo VersionInfo) *cobra.Command {
	return buildRootCommand(versionInfo)
}

// buildRootCommand constructs the root command with given version info
func buildRootCommand(versionInfo VersionInfo) *cobra.Command {
	rootCmd := &cobra.Command{
		Use:   "openframe",
		Short: "OpenFrame CLI - Kubernetes cluster bootstrapping and development tools",
		Long: `OpenFrame CLI - Interactive Kubernetes Platform Bootstrapper

OpenFrame CLI replaces the shell scripts with a modern, interactive terminal UI
for managing OpenFrame Kubernetes deployments. Built following best practices
for CLI design with wizard-style interactive prompts.

Key Features:
  - Interactive Wizard - Step-by-step guided setup
  - Cluster Management - K3d, Kind, and cloud provider support
  - Helm Integration - App-of-Apps pattern with ArgoCD
  - Developer Tools - Telepresence, Skaffold workflows
  - Prerequisite Checking - Validates tools before running

The CLI provides both interactive modes for new users and flag-based
operation for automation and power users.`,
		Version: fmt.Sprintf("%s (%s) built on %s", versionInfo.Version, versionInfo.Commit, versionInfo.Date),
	}

	// Add subcommands
	rootCmd.AddCommand(getClusterCmd())

	// Add global flags following cluster pattern
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose output")
	rootCmd.PersistentFlags().Bool("silent", false, "Suppress all output except errors")

	// Version template
	rootCmd.SetVersionTemplate(`{{printf "%s\n" .Version}}`)

	// Custom usage template with better formatting
	rootCmd.SetUsageTemplate(`Usage:{{if .Runnable}}
  {{.UseLine}}{{end}}{{if .HasAvailableSubCommands}}
  {{.CommandPath}} [command]{{end}}{{if gt (len .Aliases) 0}}

Aliases:
  {{.NameAndAliases}}{{end}}{{if .HasExample}}

Examples:
{{.Example}}{{end}}{{if .HasAvailableSubCommands}}

Available Commands:{{range .Commands}}{{if (or .IsAvailableCommand (eq .Name "help"))}}
  {{rpad .Name .NamePadding }} {{.Short}}{{end}}{{end}}{{end}}{{if .HasAvailableLocalFlags}}

Flags:
{{.LocalFlags.FlagUsages | trimTrailingWhitespaces}}{{end}}{{if .HasAvailableInheritedFlags}}

Global Flags:
{{.InheritedFlags.FlagUsages | trimTrailingWhitespaces}}{{end}}{{if .HasHelpSubCommands}}

Additional help topics:{{range .Commands}}{{if .IsAdditionalHelpTopicCommand}}
  {{rpad .CommandPath .CommandPathPadding}} {{.Short}}{{end}}{{end}}{{end}}{{if .HasAvailableSubCommands}}

Use "{{.CommandPath}} [command] --help" for more information about a command.{{end}}
`)

	return rootCmd
}

// Execute runs the root command with default version info
func Execute() error {
	return ExecuteWithVersion(DefaultVersionInfo)
}

// ExecuteWithVersion runs the root command with specified version info
func ExecuteWithVersion(versionInfo VersionInfo) error {
	rootCmd := GetRootCmd(versionInfo)
	
	// Initialize configuration using service layer
	service := config.NewSystemService()
	if err := service.Initialize(); err != nil {
		fmt.Fprintf(os.Stderr, "Warning: initialization failed: %v\n", err)
	}
	
	return rootCmd.Execute()
}

// getClusterCmd returns the cluster command
func getClusterCmd() *cobra.Command {
	return cluster.GetClusterCmd()
}


