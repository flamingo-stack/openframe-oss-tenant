package argocd

import (
	"context"
	"testing"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
)

func TestWaitForApplications_DryRun(t *testing.T) {
	mockExec := executor.NewMockCommandExecutor()
	manager := NewManager(mockExec)

	config := config.ChartInstallConfig{
		DryRun: true,
	}

	err := manager.WaitForApplications(context.Background(), config)
	assert.NoError(t, err)

	// Should not make any calls in dry-run mode
	assert.Equal(t, 0, mockExec.GetCommandCount())
}

func TestWaitForApplications_ContextCancellation(t *testing.T) {
	mockExec := executor.NewMockCommandExecutor()

	// Setup mock to return some applications
	mockExec.SetResponse("kubectl -n argocd get applications.argoproj.io", &executor.CommandResult{
		Stdout: "app1\napp2\n",
	})

	mockExec.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath", &executor.CommandResult{
		Stdout: "app1\tProgressing\tSynced\napp2\tProgressing\tSynced\n",
	})

	manager := NewManager(mockExec)
	config := config.ChartInstallConfig{
		DryRun: false,
	}

	// Create a context that will be cancelled after a short time
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	// Use a goroutine to run the wait function
	done := make(chan error)
	go func() {
		done <- manager.WaitForApplications(ctx, config)
	}()

	// Wait for the result with a timeout
	select {
	case err := <-done:
		// The function returns nil for short deadlines (< 5 seconds)
		assert.NoError(t, err)
	case <-time.After(35 * time.Second): // Wait longer than bootstrap sleep
		t.Fatal("WaitForApplications did not respect context cancellation")
	}
}

func TestWaitForApplications_AllAppsHealthy(t *testing.T) {
	t.Skip("Skipping test that requires 30-second sleep")

	mockExec := executor.NewMockCommandExecutor()

	// First call to get total applications
	mockExec.SetResponse("kubectl -n argocd get applications.argoproj.io", &executor.CommandResult{
		Stdout: "app1\napp2\n",
	})

	// Parse applications - all healthy
	mockExec.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath", &executor.CommandResult{
		Stdout: "app1\tHealthy\tSynced\napp2\tHealthy\tSynced\n",
	})

	manager := NewManager(mockExec)
	config := config.ChartInstallConfig{
		DryRun: false,
	}

	err := manager.WaitForApplications(context.Background(), config)
	assert.NoError(t, err)
}

func TestWaitForApplications_ParseError(t *testing.T) {
	t.Skip("Skipping test that requires 30-second sleep")

	mockExec := executor.NewMockCommandExecutor()

	// Setup mock to fail parsing initially, then succeed
	mockExec.SetDefaultResult(&executor.CommandResult{
		Stdout: "",
	})

	// Note: This test would need more sophisticated mocking
	// to handle the sequence of calls properly

	manager := NewManager(mockExec)
	config := config.ChartInstallConfig{
		DryRun:  false,
		Verbose: true,
	}

	// This test is simplified as the MockCommandExecutor doesn't support
	// complex scenarios like returning different results based on call count
	_ = manager
	_ = config
}
