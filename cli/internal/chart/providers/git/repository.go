package git

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
)

// Repository handles git operations for chart repositories
type Repository struct {
	executor executor.CommandExecutor
}

// NewRepository creates a new git repository handler
func NewRepository(exec executor.CommandExecutor) *Repository {
	return &Repository{
		executor: exec,
	}
}

// CloneChartRepository clones a GitHub repository to a temporary directory with depth 1
func (r *Repository) CloneChartRepository(ctx context.Context, config *models.AppOfAppsConfig) (*CloneResult, error) {
	// Create a temporary directory
	tempDir, err := os.MkdirTemp("", "openframe-chart-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary directory: %w", err)
	}

	// Use the repository URL directly (public repository)
	cloneURL := config.GitHubRepo

	// Clone with depth 1 and optimizations for speed
	cloneArgs := []string{
		"clone",
		"--depth", "1",
		"--single-branch",
		"--no-tags",
		"--branch", config.GitHubBranch,
		cloneURL,
		tempDir,
	}

	result, err := r.executor.Execute(ctx, "git", cloneArgs...)
	if err != nil {
		r.Cleanup(tempDir)
		// Check for branch not found error
		if result != nil && result.Stderr != "" {
			if strings.Contains(result.Stderr, "Remote branch") && strings.Contains(result.Stderr, "not found") {
				return nil, fmt.Errorf("branch '%s' does not exist in repository. Please check if the branch name is correct or use 'main' branch", config.GitHubBranch)
			}
			return nil, fmt.Errorf("failed to clone repository: %w\nGit output: %s", err, result.Stderr)
		}
		return nil, fmt.Errorf("failed to clone repository: %w", err)
	}

	// Build the path to the chart within the cloned repository
	chartPath := filepath.Join(tempDir, config.ChartPath)

	// Verify the chart directory exists
	if _, err := os.Stat(chartPath); os.IsNotExist(err) {
		r.Cleanup(tempDir)
		return nil, fmt.Errorf("chart path '%s' does not exist in repository", config.ChartPath)
	}

	return &CloneResult{
		TempDir:   tempDir,
		ChartPath: chartPath,
	}, nil
}

// Cleanup removes the temporary directory
func (r *Repository) Cleanup(tempDir string) {
	if tempDir != "" {
		if err := os.RemoveAll(tempDir); err != nil {
			// Log the error but don't fail the operation
			// This is cleanup so we don't want to break the main flow
			fmt.Printf("Warning: failed to cleanup temporary directory %s: %v\n", tempDir, err)
		}
	}
}
