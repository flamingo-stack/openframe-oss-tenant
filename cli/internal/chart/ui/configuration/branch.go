package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/ui/templates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// BranchConfigurator handles branch configuration
type BranchConfigurator struct {
	modifier *templates.HelmValuesModifier
}

// NewBranchConfigurator creates a new branch configurator
func NewBranchConfigurator(modifier *templates.HelmValuesModifier) *BranchConfigurator {
	return &BranchConfigurator{
		modifier: modifier,
	}
}

// Configure asks user about Git branch configuration
func (b *BranchConfigurator) Configure(config *types.ChartConfiguration) error {
	// Skip branch configuration for SaaS and SaaS Shared modes - it's handled in SaaS configuration
	if config.DeploymentMode != nil && (*config.DeploymentMode == types.DeploymentModeSaaS || *config.DeploymentMode == types.DeploymentModeSaaSShared) {
		return nil
	}

	// For OSS deployment, configure OSS repository branch
	currentBranch := b.modifier.GetCurrentOSSBranch(config.ExistingValues)

	pterm.Info.Printf("OSS Repository Branch Configuration (current: %s)", currentBranch)

	options := []string{
		fmt.Sprintf("Keep '%s' branch", currentBranch),
		"Specify custom branch",
	}

	_, choice, err := sharedUI.SelectFromList("OSS repository branch", options)
	if err != nil {
		return fmt.Errorf("branch choice failed: %w", err)
	}

	if strings.Contains(choice, "custom") {
		branch, err := pterm.DefaultInteractiveTextInput.
			WithDefaultValue(currentBranch).
			WithMultiLine(false).
			Show("Enter OSS Git branch name")

		if err != nil {
			return fmt.Errorf("branch input failed: %w", err)
		}

		branch = strings.TrimSpace(branch)
		if branch != currentBranch {
			config.Branch = &branch
			config.ModifiedSections = append(config.ModifiedSections, "branch")
		}
	}

	return nil
}
