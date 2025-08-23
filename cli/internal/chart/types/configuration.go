package types

// DockerRegistryConfig holds Docker registry settings
type DockerRegistryConfig struct {
	Username string
	Password string
	Email    string
}

// ChartConfiguration holds all configurable options for chart installation
type ChartConfiguration struct {
	HelmValuesPath   string                 // Path to the Helm values file
	ExistingValues   map[string]interface{} // Current values from the file
	ModifiedSections []string               // Track which sections were modified
	Branch           *string                // nil means use existing, otherwise use this value
	DockerRegistry   *DockerRegistryConfig  // nil means use existing, otherwise use this value
}