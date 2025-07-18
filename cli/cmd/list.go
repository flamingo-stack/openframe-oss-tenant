package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var (
	listDetailed bool
	listJson     bool
	listType     string
)

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List available services",
	Long: `List all available services in the OpenFrame project.

This command shows all available services grouped by type (microservices,
integrated tools, datasources, client tools, and platform services) with their basic information.

Examples:
  openframe list                    # List all services
  openframe list --detailed         # Show detailed information
  openframe list --json             # Output in JSON format
  openframe list --type microservice # List only microservices
  openframe list --type datasources # List only datasources
  openframe list --type client-tools # List only client tools
  openframe list --type platform    # List only platform services`,
	Args: cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		// Validate type parameter if provided
		if listType != "" {
			validTypes := []string{
				"microservice", "microservices",
				"integrated", "integrated-tools",
				"datasource", "datasources",
				"client-tool", "client-tools",
				"platform",
			}
			isValid := false
			for _, validType := range validTypes {
				if strings.EqualFold(listType, validType) {
					isValid = true
					break
				}
			}
			if !isValid {
				return fmt.Errorf("invalid service type: %s. Valid types are: microservice, integrated, datasources, client-tools, platform", listType)
			}
		}

		// If CLI is not initialized (e.g., in tests), just return success
		if cli == nil {
			return nil
		}

		// Set verbose mode if requested (from global flags)
		verbose, _ := cmd.Flags().GetBool("verbose")
		if verbose {
			cli.SetVerbose(true)
		}

		if listJson {
			return cli.ListJSON()
		}

		cli.List(listDetailed, listType)
		return nil
	},
}

func init() {
	listCmd.Flags().BoolVar(&listDetailed, "detailed", false, "Show detailed service information")
	listCmd.Flags().BoolVar(&listJson, "json", false, "Output in JSON format")
	listCmd.Flags().StringVar(&listType, "type", "", "Filter by service type (microservice|integrated|datasources|client-tools|platform)")

	rootCmd.AddCommand(listCmd)
}
