package diagnose

import (
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/docker"
	"github.com/spf13/cobra"
)

// GetDiagnoseCmd returns the diagnose command
func GetDiagnoseCmd() *cobra.Command {
	diagnoseCmd := &cobra.Command{
		Use:   "diagnose",
		Short: "Run diagnostics on system prerequisites",
		Long: `Run comprehensive diagnostics on system prerequisites.

This command helps troubleshoot issues with Docker and other prerequisites
by showing detailed status information, logs, and configuration.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Show Docker diagnostics
			docker.ShowDockerDiagnostics()
			return nil
		},
	}

	return diagnoseCmd
}
