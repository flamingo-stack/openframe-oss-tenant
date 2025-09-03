package scaffold

import (
	"context"
)

// BootstrapService interface for bootstrap operations
type BootstrapService interface {
	Execute(cmd interface{}, args []string) error
}

// PrerequisiteChecker interface for checking prerequisites
type PrerequisiteChecker interface {
	IsInstalled() bool
	GetInstallHelp() string
	Install() error
	GetVersion() (string, error)
}

// ScaffoldRunner interface for running Skaffold operations
type ScaffoldRunner interface {
	RunDev(ctx context.Context, args []string) error
	Build(ctx context.Context, args []string) error
	Deploy(ctx context.Context, args []string) error
}