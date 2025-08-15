package bootstrap

// HelmManager handles Helm operations for bootstrapping
type HelmManager struct {
	namespace string
	dryRun    bool
}

// NewHelmManager creates a new Helm manager
func NewHelmManager(namespace string, dryRun bool) *HelmManager {
	return &HelmManager{
		namespace: namespace,
		dryRun:    dryRun,
	}
}

// InstallChart installs a Helm chart
func (h *HelmManager) InstallChart(chartName, releaseName string, values map[string]interface{}) error {
	// TODO: Implement Helm chart installation
	return nil
}