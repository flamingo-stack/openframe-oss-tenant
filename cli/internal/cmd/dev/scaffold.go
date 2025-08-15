package dev

import (
	"github.com/spf13/cobra"
)

// getScaffoldCmd returns the scaffold command
func getScaffoldCmd() *cobra.Command {
	scaffoldCmd := &cobra.Command{
		Use:   "scaffold [template-type]",
		Short: "Generate code scaffolding from templates",
		Long: `Code Scaffolding - Generate boilerplate code from templates

Creates new code structures based on predefined templates. Useful for
maintaining consistency across services and reducing setup time for
new components.

Available templates:
  - microservice - Complete Spring Boot microservice
  - frontend - Vue.js frontend component
  - helm-chart - Kubernetes Helm chart
  - api-client - OpenAPI client generation

Examples:
  # Generate a new microservice
  openframe dev scaffold microservice --name user-service

  # Generate Vue component
  openframe dev scaffold frontend --name UserProfile --type component

  # Generate Helm chart
  openframe dev scaffold helm-chart --name my-app
`,
		Args: cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			// TODO: Implement scaffold logic
			// templateType := args[0]
			// generateScaffold(templateType)
		},
	}

	scaffoldCmd.Flags().String("name", "", "Name for the generated code")
	scaffoldCmd.Flags().String("output", ".", "Output directory")
	scaffoldCmd.Flags().String("type", "", "Specific type within template category")
	scaffoldCmd.Flags().Bool("interactive", true, "Use interactive prompts")

	return scaffoldCmd
}