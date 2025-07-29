package cmd

import (
	"fmt"
	"os"

	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

var (
	version       = "dev"
	commit        = "none"
	date          = "unknown"
	globalVerbose bool
	globalSilent  bool
)

var rootCmd = &cobra.Command{
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
	Version: fmt.Sprintf("%s (%s) built on %s", version, commit, date),
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		// Configure pterm based on global flags
		if globalSilent {
			pterm.DisableOutput()
		}
		if globalVerbose {
			pterm.EnableDebugMessages()
		}
	},
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	// Global flags
	rootCmd.PersistentFlags().BoolVarP(&globalVerbose, "verbose", "v", false, "Enable verbose output")
	rootCmd.PersistentFlags().BoolVar(&globalSilent, "silent", false, "Suppress all output except errors")

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

	// Show OpenFrame logo on help
	cobra.OnInitialize(initConfig)
}

func initConfig() {
	// Set up logging directory
	os.MkdirAll("/tmp/openframe-deployment-logs", 0755)
}

// ShowLogo displays the OpenFrame ASCII logo
func ShowLogo() {
	logo := pterm.DefaultCenter.Sprint(`
   ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██████╗  █████╗ ███╗   ███╗███████╗
  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝
  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║█████╗  ██████╔╝███████║██╔████╔██║█████╗  
  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  
  ╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗
   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
  `)

	pterm.DefaultBox.WithTitle("OpenFrame Platform Bootstrapper").
		WithTitleTopCenter().
		WithBoxStyle(pterm.NewStyle(pterm.FgCyan)).
		Println(logo)
}
