package cmd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"openframe/internal/app"

	"github.com/spf13/cobra"
)

var cli *app.App

// Version information
var (
	version = "dev"
	commit  = "unknown"
	date    = "unknown"
)

// rootCmd represents the base command
var rootCmd = &cobra.Command{
	Use:     "openframe",
	Version: fmt.Sprintf("%s (commit: %s, built: %s)", version, commit, date),
	Short:   "OpenFrame development CLI",
	Long: `A powerful CLI tool for managing OpenFrame platform development workflows.

Features:
  • Development mode with Skaffold integration
  • Service interception with Telepresence
  • Service discovery and status monitoring
  • Dependency validation and health checks

Examples:
  openframe dev openframe-api          # Start API service in dev mode
  openframe intercept openframe-ui 3000 80  # Intercept UI service
  openframe list                      # List all available services`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		var err error
		cli, err = app.New()
		if err != nil {
			return fmt.Errorf("failed to initialize app: %w", err)
		}

		dryRun, _ := cmd.Flags().GetBool("dry-run")
		cli.SetDryRun(dryRun)

		return nil
	},
}

// Execute adds all child commands to the root command
func Execute() error {
	return rootCmd.Execute()
}

// withGracefulShutdown runs a function with graceful shutdown handling
func withGracefulShutdown(ctx context.Context, fn func(context.Context) error) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n🛑 Shutting down gracefully...")
		cancel()
	}()

	return fn(ctx)
}

func init() {
	rootCmd.PersistentFlags().Bool("dry-run", false, "Show what would be executed without running commands")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose output")

	// Add completion command
	rootCmd.AddCommand(&cobra.Command{
		Use:   "completion [bash|zsh|fish|powershell]",
		Short: "Generate completion script",
		Long: `To load completions:

Bash:
  $ source <(openframe completion bash)

  # To load completions for each session, execute once:
  # Linux:  openframe completion bash > /etc/bash_completion.d/openframe
  # macOS:  openframe completion bash > /usr/local/etc/bash_completion.d/openframe

Zsh:
  # If shell completion is not already enabled in your environment,
  # you will need to enable it.  You can execute the following:

  $ echo "autoload -U compinit; compinit" >> ~/.zshrc

  # To load completions for each session, execute once:
  $ openframe completion zsh > "${fpath[1]}/_openframe"

  # You will need to start a new shell for this setup to take effect.

Fish:
  $ openframe completion fish | source

  # To load completions for each session, execute once:
  $ openframe completion fish > ~/.config/fish/completions/openframe.fish

PowerShell:
  PS> openframe completion powershell | Out-String | Invoke-Expression

  # To load completions for every new session, run:
  PS> openframe completion powershell > openframe.ps1
  # and source this file from your PowerShell profile.
`,
		DisableFlagsInUseLine: true,
		ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
		Args:                  cobra.ExactValidArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			switch args[0] {
			case "bash":
				cmd.Root().GenBashCompletion(os.Stdout)
			case "zsh":
				cmd.Root().GenZshCompletion(os.Stdout)
			case "fish":
				cmd.Root().GenFishCompletion(os.Stdout, true)
			case "powershell":
				cmd.Root().GenPowerShellCompletion(os.Stdout)
			}
		},
	})
}
