package config

import (
	"os"
	"runtime"
)

// OpenFrameConfig holds the global configuration
type OpenFrameConfig struct {
	// Network configuration
	IP     string `yaml:"ip"`
	Domain string `yaml:"domain"`

	// Cluster configuration
	K8sVersion    string `yaml:"k8sVersion"`
	ArgoCDVersion string `yaml:"argoCDVersion"`
	ClusterName   string `yaml:"clusterName"`
	RegistryPort  int    `yaml:"registryPort"`

	// Runtime configuration
	OS           string `yaml:"os"`
	Silent       bool   `yaml:"silent"`
	DeployLogDir string `yaml:"deployLogDir"`

	// Directory paths
	RepoPath       string `yaml:"repoPath"`
	ScriptDir      string `yaml:"scriptDir"`
	ManifestsDir   string `yaml:"manifestsDir"`
	HelmValuesFile string `yaml:"helmValuesFile"`
}

// DefaultConfig returns the default configuration matching the shell script variables
func DefaultConfig() *OpenFrameConfig {
	ip := getEnvOrDefault("IP", "192.168.100.100")
	domain := getEnvOrDefault("DOMAIN", ip+".nip.io")

	return &OpenFrameConfig{
		IP:             ip,
		Domain:         domain,
		K8sVersion:     getEnvOrDefault("K8S_VERSION", "v1.31.5-k3s1"),
		ArgoCDVersion:  getEnvOrDefault("ARGOCD_VERSION", "3.0.11"),
		ClusterName:    getEnvOrDefault("K3D_CLUSTER_NAME", "openframe-dev"),
		RegistryPort:   5050,
		OS:             runtime.GOOS,
		Silent:         getEnvOrDefault("SILENT", "false") == "true",
		DeployLogDir:   getEnvOrDefault("DEPLOY_LOG_DIR", "/tmp/openframe-deployment-logs"),
		RepoPath:       "", // Will be detected at runtime
		ScriptDir:      "", // Will be detected at runtime
		ManifestsDir:   "", // Will be detected at runtime
		HelmValuesFile: "", // Will be set based on script dir
	}
}

// ClusterBootstrapConfig holds the configuration for cluster bootstrapping
type ClusterBootstrapConfig struct {
	// Cluster settings
	Name              string `yaml:"name"`
	Type              string `yaml:"type"`
	KubernetesVersion string `yaml:"kubernetesVersion"`
	NodeCount         int    `yaml:"nodeCount"`

	// Network settings
	HTTPPort  int `yaml:"httpPort"`
	HTTPSPort int `yaml:"httpsPort"`
	APIPort   int `yaml:"apiPort"`

	// Component selection
	DeploymentMode string          `yaml:"deploymentMode"`
	Components     map[string]bool `yaml:"components"`

	// Helm configuration
	HelmRepos map[string]string `yaml:"helmRepos"`
	Charts    []ChartConfig     `yaml:"charts"`

	// System detection
	SystemInfo SystemInfo `yaml:"systemInfo"`
}

// ChartConfig represents a Helm chart to be installed
type ChartConfig struct {
	Name         string                 `yaml:"name"`
	Chart        string                 `yaml:"chart"`
	Version      string                 `yaml:"version,omitempty"`
	Namespace    string                 `yaml:"namespace"`
	CreateNS     bool                   `yaml:"createNamespace,omitempty"`
	Values       map[string]interface{} `yaml:"values,omitempty"`
	ValuesFile   string                 `yaml:"valuesFile,omitempty"`
	Wait         bool                   `yaml:"wait,omitempty"`
	Timeout      string                 `yaml:"timeout,omitempty"`
	Dependencies []string               `yaml:"dependencies,omitempty"`
}

// SystemInfo holds detected system information
type SystemInfo struct {
	OS           string `yaml:"os"`
	Architecture string `yaml:"architecture"`
	CPUCores     int    `yaml:"cpuCores"`
	MemoryGB     int    `yaml:"memoryGB"`
	IsARM64      bool   `yaml:"isARM64"`
	OptimalNodes int    `yaml:"optimalNodes"`
}

// DeploymentModes defines the available deployment modes
var DeploymentModes = map[string]string{
	"development": "Development mode with hot reload and debugging tools",
	"production":  "Production-like setup with monitoring and security",
	"minimal":     "Minimal setup with core services only",
}

// DefaultComponents defines the default component selection for each mode
var DefaultComponents = map[string]map[string]bool{
	"development": {
		"argocd":          true,
		"monitoring":      false,
		"openframe-core":  true,
		"openframe-ui":    true,
		"external-tools":  false,
		"developer-tools": true,
	},
	"production": {
		"argocd":          true,
		"monitoring":      true,
		"openframe-core":  true,
		"openframe-ui":    true,
		"external-tools":  true,
		"developer-tools": false,
	},
	"minimal": {
		"argocd":          true,
		"monitoring":      false,
		"openframe-core":  true,
		"openframe-ui":    false,
		"external-tools":  false,
		"developer-tools": false,
	},
}

// SupportedClusterTypes lists the supported cluster providers
var SupportedClusterTypes = []string{
	"k3d",
	"kind",
	"gke",
	"eks",
}

// RequiredTools lists tools that must be available for each cluster type
var RequiredTools = map[string][]string{
	"k3d":  {"docker", "k3d", "kubectl", "helm"},
	"kind": {"docker", "kind", "kubectl", "helm"},
	"gke":  {"gcloud", "kubectl", "helm"},
	"eks":  {"aws", "kubectl", "helm"},
}

// OptionalTools lists optional tools that enhance functionality
var OptionalTools = []string{
	"telepresence",
	"skaffold",
	"argocd",
}

// getEnvOrDefault returns environment variable value or default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ValidateConfig validates the bootstrap configuration
func (c *ClusterBootstrapConfig) ValidateConfig() error {
	if c.Name == "" {
		c.Name = "openframe-dev"
	}

	if c.Type == "" {
		c.Type = "k3d"
	}

	if c.NodeCount < 1 {
		c.NodeCount = 1
	}

	if c.HTTPPort == 0 {
		c.HTTPPort = 80
	}

	if c.HTTPSPort == 0 {
		c.HTTPSPort = 443
	}

	if c.APIPort == 0 {
		c.APIPort = 6550
	}

	// Set default components if none specified
	if len(c.Components) == 0 {
		if mode, ok := DefaultComponents[c.DeploymentMode]; ok {
			c.Components = make(map[string]bool)
			for k, v := range mode {
				c.Components[k] = v
			}
		} else {
			c.Components = DefaultComponents["development"]
		}
	}

	return nil
}

// GetHelmRepos returns the default Helm repositories
func GetHelmRepos() map[string]string {
	return map[string]string{
		"argo":          "https://argoproj.github.io/argo-helm",
		"prometheus":    "https://prometheus-community.github.io/helm-charts",
		"grafana":       "https://grafana.github.io/helm-charts",
		"ingress-nginx": "https://kubernetes.github.io/ingress-nginx",
		"cert-manager":  "https://charts.jetstack.io",
	}
}
