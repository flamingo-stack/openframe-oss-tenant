package bootstrap

import (
	"github.com/flamingo/openframe/internal/bootstrap"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/spf13/cobra"
)

// GetBootstrapCmd returns the bootstrap command
func GetBootstrapCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "bootstrap [cluster-name]",
		Short: "Bootstrap complete OpenFrame environment",
		Long: `Bootstrap Complete OpenFrame Environment

This command performs a complete OpenFrame setup by running:
1. openframe cluster create - Creates a Kubernetes cluster
2. openframe chart install - Installs ArgoCD and OpenFrame charts

This is equivalent to running both commands sequentially but provides
a streamlined experience for getting started with OpenFrame.

Examples:
  openframe bootstrap                    # Bootstrap with default cluster name
  openframe bootstrap my-cluster        # Bootstrap with custom cluster name`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			ui.ShowLogo()
			return bootstrap.NewService().Execute(cmd, args)
		},
	}

	return cmd
}