package intercept

import (
	"context"
	"fmt"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/pterm/pterm"
)

// createIntercept creates the actual telepresence intercept
func (s *Service) createIntercept(ctx context.Context, serviceName string, flags *models.InterceptFlags) error {
	pterm.Info.Printf("Starting intercept for %s\n", serviceName)

	// Build intercept command following the original script pattern
	args := []string{"intercept", serviceName}

	// Add port mapping (local_port:remote_port_name format from original)
	portMapping := fmt.Sprintf("%d:%s", flags.Port, s.getRemotePortName(flags))
	args = append(args, "--port", portMapping)

	// Disable mount by default (like original script)
	args = append(args, "--mount=false")

	// Add additional flags if specified
	if flags.EnvFile != "" {
		args = append(args, "--env-file", flags.EnvFile)
	}

	if flags.Global {
		args = append(args, "--global")
	}

	for _, header := range flags.Header {
		args = append(args, "--http-header", header)
	}

	if flags.Replace {
		args = append(args, "--replace")
	}

	// Execute the intercept command
	_, err := s.executor.Execute(ctx, "telepresence", args...)
	if err != nil {
		return fmt.Errorf("failed to create intercept: %w", err)
	}

	return nil
}

// getRemotePortName determines the remote port name for the intercept
func (s *Service) getRemotePortName(flags *models.InterceptFlags) string {
	// If not specified, use the port number as string (common pattern)
	if flags.RemotePortName != "" {
		return flags.RemotePortName
	}
	return fmt.Sprintf("%d", flags.Port)
}