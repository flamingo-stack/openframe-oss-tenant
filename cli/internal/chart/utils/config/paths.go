package config

import (
	"os"
	"path/filepath"
)

// PathResolver handles path resolution for chart-related files and directories
type PathResolver struct{}

// NewPathResolver creates a new path resolver
func NewPathResolver() *PathResolver {
	return &PathResolver{}
}

// GetCertificateDirectory returns the directory where certificates are stored
func (p *PathResolver) GetCertificateDirectory() string {
	// Certificates are stored in ~/.config/openframe/certs as per the certificate installer
	homeDir, err := os.UserHomeDir()
	if err != nil {
		// Fallback to working directory if home directory can't be determined
		if wd, err := os.Getwd(); err == nil {
			return filepath.Join(wd, "internal", "chart", "prerequisites", "certs")
		}
		return ""
	}

	certDir := filepath.Join(homeDir, ".config", "openframe", "certs")

	// Check if the directory exists
	if _, err := os.Stat(certDir); os.IsNotExist(err) {
		// Create the directory if it doesn't exist
		os.MkdirAll(certDir, 0755)
	}

	return certDir
}

// GetManifestsDirectory returns the relative path to the manifests directory
func (p *PathResolver) GetManifestsDirectory() string {
	// Return relative path from typical execution context
	// This assumes execution from the project root or CLI directory
	return "cli/internal/chart/manifests"
}

// GetHelmValuesFile returns the path to the helm values file
func (p *PathResolver) GetHelmValuesFile() string {
	// Return relative path to helm-values.yaml in CLI directory
	// This file should be dynamically read at runtime
	return "./helm-values.yaml"
}

// GetArgocdValuesFile returns the relative path to the ArgoCD values file
func (p *PathResolver) GetArgocdValuesFile() string {
	return filepath.Join(p.GetManifestsDirectory(), "argocd-values.yaml")
}

// GetCertificateFiles returns the paths to the certificate files
func (p *PathResolver) GetCertificateFiles() (certFile, keyFile string) {
	certDir := p.GetCertificateDirectory()
	return filepath.Join(certDir, "localhost.pem"), filepath.Join(certDir, "localhost-key.pem")
}
