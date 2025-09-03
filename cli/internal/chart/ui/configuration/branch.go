package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
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
	// Get current branch from existing values
	currentBranch := b.modifier.GetCurrentBranch(config.ExistingValues)
	
	pterm.Info.Printf("Git Branch Configuration (current: %s)", currentBranch)
	
	options := []string{
		fmt.Sprintf("Keep '%s' branch", currentBranch),
		"Specify custom branch",
	}
	
	_, choice, err := sharedUI.SelectFromList("Manifests branch", options)
	if err != nil {
		return fmt.Errorf("branch choice failed: %w", err)
	}
	
	if strings.Contains(choice, "custom") {
		branch, err := pterm.DefaultInteractiveTextInput.
			WithDefaultValue(currentBranch).
			WithMultiLine(false).
			Show("Enter Git branch name")
		
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