package app

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// Developer handles development mode operations
type Developer struct {
	app         *App
	portForward bool
	tail        bool
	cleanup     bool
	timeout     string
}

// NewDeveloper creates a new developer
func NewDeveloper(app *App) *Developer {
	return &Developer{
		app:         app,
		portForward: true,
		tail:        true,
		cleanup:     true,
		timeout:     "0",
	}
}

// SetFlags sets the development flags
func (d *Developer) SetFlags(portForward, tail, cleanup bool, timeout string) {
	d.portForward = portForward
	d.tail = tail
	d.cleanup = cleanup
	d.timeout = timeout
}

// Dev runs a service in development mode with enhanced features
func (d *Developer) Dev(ctx context.Context, service string) error {
	// Validate service exists
	serviceConfig, err := d.app.config.GetService(service)
	if err != nil {
		return fmt.Errorf("service not found: %s", service)
	}

	// Check if skaffold.yaml exists
	skaffoldFile := filepath.Join(serviceConfig.Directory, "skaffold.yaml")
	if _, err := os.Stat(skaffoldFile); err != nil {
		return fmt.Errorf("skaffold.yaml not found in %s", serviceConfig.Directory)
	}

	// Check telepresence connection
	if !d.app.telepresence.IsConnected() {
		fmt.Println("⚠️  Telepresence not connected. Run 'telepresence connect' first.")
		if d.app.config.Settings.Telepresence.AutoConnect {
			fmt.Println("🔄 Attempting to connect to telepresence...")
			if err := d.app.telepresence.Connect(); err != nil {
				return fmt.Errorf("failed to connect telepresence: %w", err)
			}
		}
	}

	fmt.Printf("🚀 Starting %s in development mode (namespace: %s)\n", service, serviceConfig.Namespace)

	// Enhanced skaffold args for better dev experience
	args := []string{
		"dev",
		"--cache-artifacts=false",
		"--no-prune=false",
		"--no-prune-children=false",
		"-n", serviceConfig.Namespace,
	}

	// Add configuration-based flags
	if d.portForward {
		args = append(args, "--port-forward")
	}
	if d.tail {
		args = append(args, "--tail")
	}
	if !d.cleanup {
		args = append(args, "--no-cleanup")
	}
	if d.timeout != "0" {
		args = append(args, "--timeout", d.timeout)
	}

	return d.app.executor.RunInDirWithSignalHandling(ctx, serviceConfig.Directory, "skaffold", args...)
}
