package app

import (
	"context"
	"fmt"

	"openframe/internal/config"
	"openframe/internal/utils"
)

// App handles all CLI operations
type App struct {
	rootDir      string
	dryRun       bool
	verbose      bool
	config       *config.ProjectConfig
	executor     *CommandExecutor
	telepresence *TelepresenceManager
	lister       *ServiceLister
	developer    *Developer
	interceptor  *Interceptor
}

// New creates a new app instance
func New() (*App, error) {
	rootDir, err := utils.FindRootDir()
	if err != nil {
		return nil, err
	}

	projectConfig, err := config.NewProjectConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load project config: %w", err)
	}

	app := &App{
		rootDir: rootDir,
		config:  projectConfig,
	}

	// Initialize modules
	app.executor = NewCommandExecutor(app)
	app.telepresence = NewTelepresenceManager(app)
	app.lister = NewServiceLister(app)
	app.developer = NewDeveloper(app)
	app.interceptor = NewInterceptor(app)

	return app, nil
}

// SetDryRun enables dry run mode
func (a *App) SetDryRun(dryRun bool) {
	a.dryRun = dryRun
}

// SetVerbose enables verbose output
func (a *App) SetVerbose(verbose bool) {
	a.verbose = verbose
}

// SetDevFlags sets development mode flags
func (a *App) SetDevFlags(portForward, tail, cleanup bool, timeout string) {
	a.developer.SetFlags(portForward, tail, cleanup, timeout)
}

// SetInterceptFlags sets intercept mode flags
func (a *App) SetInterceptFlags(mount, force bool, timeout string) {
	a.interceptor.SetFlags(mount, force, timeout)
}

// ValidateService checks if a service exists
func (a *App) ValidateService(service string) error {
	_, err := a.config.GetService(service)
	return err
}

// Dev runs a service in development mode with enhanced features
func (a *App) Dev(ctx context.Context, service string) error {
	return a.developer.Dev(ctx, service)
}

// Intercept starts a telepresence intercept with enhanced validation
func (a *App) Intercept(ctx context.Context, service, localPort, remotePort string) error {
	return a.interceptor.Intercept(ctx, service, localPort, remotePort)
}

// List shows available services with enhanced formatting
func (a *App) List(detailed bool, serviceType string) {
	a.lister.List(detailed, serviceType)
}

// ListJSON outputs services in JSON format
func (a *App) ListJSON() error {
	return a.lister.ListJSON()
}

// ValidatePort validates a port number
func (a *App) ValidatePort(port string) error {
	return a.telepresence.ValidatePort(port)
}
