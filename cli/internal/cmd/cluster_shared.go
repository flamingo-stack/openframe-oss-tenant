package cmd

import (
	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/cluster/providers"
	"github.com/pterm/pterm"
)

// showLogo displays the OpenFrame ASCII logo
func showLogo() {
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

// createDefaultManager creates a manager with default providers registered
func createDefaultManager() *cluster.Manager {
	manager := cluster.NewManager()
	
	// Register K3d provider
	k3dProvider := providers.NewK3dProvider(cluster.ProviderOptions{})
	manager.RegisterProvider(cluster.ClusterTypeK3d, k3dProvider)
	
	// Future: Register other providers like GKE, EKS, etc.
	
	return manager
}