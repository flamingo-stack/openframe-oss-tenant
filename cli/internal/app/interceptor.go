package app

import (
	"context"
	"fmt"
)

// Interceptor handles telepresence intercept operations
type Interceptor struct {
	app     *App
	mount   bool
	force   bool
	timeout string
}

// NewInterceptor creates a new interceptor
func NewInterceptor(app *App) *Interceptor {
	return &Interceptor{
		app:     app,
		mount:   false,
		force:   false,
		timeout: "30s",
	}
}

// SetFlags sets the intercept flags
func (i *Interceptor) SetFlags(mount, force bool, timeout string) {
	i.mount = mount
	i.force = force
	i.timeout = timeout
}

// Intercept starts a telepresence intercept with enhanced validation
func (i *Interceptor) Intercept(ctx context.Context, service, localPort, remotePort string) error {
	// Validate service exists
	serviceConfig, err := i.app.config.GetService(service)
	if err != nil {
		return fmt.Errorf("service not found: %s", service)
	}

	// Validate ports
	if err := i.app.telepresence.ValidatePort(localPort); err != nil {
		return fmt.Errorf("invalid local port: %v", err)
	}
	if err := i.app.telepresence.ValidatePort(remotePort); err != nil {
		return fmt.Errorf("invalid remote port: %v", err)
	}

	// Check if telepresence is connected
	if !i.app.telepresence.IsConnected() {
		return fmt.Errorf("telepresence not connected. Run 'telepresence connect' first")
	}

	// Check if intercept already exists
	if i.app.telepresence.HasIntercept(service) {
		if i.force {
			fmt.Printf("⚠️  Intercept for %s already exists. Removing existing intercept...\n", service)
			if err := i.app.telepresence.RemoveIntercept(service); err != nil {
				fmt.Printf("Warning: failed to remove existing intercept: %v\n", err)
			}
		} else {
			return fmt.Errorf("intercept for %s already exists. Use --force to replace it", service)
		}
	}

	fmt.Printf("🔗 Creating intercept for %s (%s:%s -> %s)\n", service, localPort, remotePort, serviceConfig.Namespace)

	args := []string{
		"intercept", service,
		"--port", fmt.Sprintf("%s:%s", localPort, remotePort),
		"-n", serviceConfig.Namespace,
	}

	if i.mount {
		args = append(args, "--mount")
	} else {
		args = append(args, "--mount=false")
	}

	if i.timeout != "30s" {
		args = append(args, "--timeout", i.timeout)
	}

	return i.app.executor.RunWithSignalHandling(ctx, "telepresence", args...)
}
