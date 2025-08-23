package types

// DockerRegistryConfig holds Docker registry settings
type DockerRegistryConfig struct {
	Username string
	Password string
	Email    string
}

// ChartConfiguration holds all configurable options for chart installation
type ChartConfiguration struct {
	BaseHelmValuesPath string                 // Path to the original helm-values.yaml (read-only)
	TempHelmValuesPath string                 // Path to the temporary helm values file for installation
	ExistingValues     map[string]interface{} // Current values from the file
	ModifiedSections   []string               // Track which sections were modified
	Branch             *string                // nil means use existing, otherwise use this value
	DockerRegistry     *DockerRegistryConfig  // nil means use existing, otherwise use this value
}