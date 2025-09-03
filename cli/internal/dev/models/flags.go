package models

import "github.com/spf13/cobra"

// InterceptFlags holds all flags for the intercept command
type InterceptFlags struct {
	Port           int      // Local port to forward traffic to
	Namespace      string   // Kubernetes namespace of the service
	Mount          string   // Mount remote volumes to local path
	EnvFile        string   // Load environment variables from file
	Global         bool     // Intercept all traffic (not just from specific headers)
	Header         []string // Only intercept traffic with these headers
	Replace        bool     // Replace existing intercept if it exists
	RemotePortName string   // Remote port name for the intercept (defaults to port number)
}

// ScaffoldFlags holds all flags for the scaffold command
type ScaffoldFlags struct {
	Image           string // Docker image to use for the service
	Port            int    // Port to forward from the service
	Namespace       string // Kubernetes namespace to deploy to
	SyncLocal       string // Local directory to sync to the container
	SyncRemote      string // Remote directory to sync files to
	ConfigMap       string // ConfigMap to mount in the container
	Secret          string // Secret to mount in the container
	ClusterName     string // Cluster name to use
	SkipBootstrap   bool   // Skip bootstrapping cluster
	HelmValuesFile  string // Custom Helm values file for bootstrap
}

// AddGlobalFlags adds global flags to the dev command
func AddGlobalFlags(cmd *cobra.Command) {
	cmd.PersistentFlags().BoolP("verbose", "v", false, "Enable verbose output")
	cmd.PersistentFlags().Bool("silent", false, "Suppress all output except errors")
	cmd.PersistentFlags().Bool("dry-run", false, "Show what would be done without executing")
}