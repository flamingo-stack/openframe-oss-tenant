package config

import (
	"os"
	"path/filepath"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	sharedConfig "github.com/flamingo-stack/openframe/openframe/internal/shared/config"
)

// Service provides centralized configuration management for chart operations
type Service struct {
	systemService *sharedConfig.SystemService
	pathResolver  *PathResolver
}

// NewService creates a new configuration service
func NewService() *Service {
	return &Service{
		systemService: sharedConfig.NewSystemService(),
		pathResolver:  NewPathResolver(),
	}
}

// GetCertificateDirectory returns the certificate directory path
func (s *Service) GetCertificateDirectory() string {
	return s.pathResolver.GetCertificateDirectory()
}

// GetCertificateFiles returns the paths to certificate and key files
func (s *Service) GetCertificateFiles() (certFile, keyFile string) {
	return s.pathResolver.GetCertificateFiles()
}

// GetHelmValuesFile returns the path to the Helm values file
func (s *Service) GetHelmValuesFile() string {
	return s.pathResolver.GetHelmValuesFile()
}

// GetLogDirectory returns the log directory from shared config
func (s *Service) GetLogDirectory() string {
	return s.systemService.GetLogDirectory()
}

// GetPathResolver returns the path resolver instance
func (s *Service) GetPathResolver() *PathResolver {
	return s.pathResolver
}

// Initialize performs any necessary configuration initialization
func (s *Service) Initialize() error {
	// Initialize shared system service
	if err := s.systemService.Initialize(); err != nil {
		return err
	}

	// Ensure certificate directory exists
	certDir := s.GetCertificateDirectory()
	if _, err := os.Stat(certDir); os.IsNotExist(err) {
		if err := os.MkdirAll(certDir, 0755); err != nil {
			return err
		}
	}

	return nil
}

// BuildInstallConfig creates a complete installation configuration
func (s *Service) BuildInstallConfig(
	force, dryRun, verbose bool,
	clusterName string,
	appOfAppsConfig *models.AppOfAppsConfig,
) ChartInstallConfig {
	// Set default certificate directory if not provided
	if appOfAppsConfig != nil && appOfAppsConfig.CertDir == "" {
		appOfAppsConfig.CertDir = s.GetCertificateDirectory()
	}

	return ChartInstallConfig{
		ClusterName: clusterName,
		Force:       force,
		DryRun:      dryRun,
		Verbose:     verbose,
		Silent:      false,
		AppOfApps:   appOfAppsConfig,
	}
}

// GetDefaultManifestsPath returns the default path to manifests
func (s *Service) GetDefaultManifestsPath() string {
	// Try to find manifests in the current working directory
	if wd, err := os.Getwd(); err == nil {
		manifestsPath := filepath.Join(wd, "internal", "chart", "manifests")
		if _, err := os.Stat(manifestsPath); err == nil {
			return manifestsPath
		}
	}

	// Fallback to home directory location
	if homeDir, err := os.UserHomeDir(); err == nil {
		return filepath.Join(homeDir, ".config", "openframe", "manifests")
	}

	return ""
}
