package models

// ChartInfo represents information about an installed chart
type ChartInfo struct {
	Name       string
	Namespace  string
	Status     string
	Version    string
	AppVersion string
}

// ChartType represents the type of chart
type ChartType string

const (
	ChartTypeArgoCD    ChartType = "argocd"
	ChartTypeAppOfApps ChartType = "app-of-apps"
)