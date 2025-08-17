package dev

import (
	"github.com/pterm/pterm"
)

// PromptForServiceName prompts user for service name
func PromptForServiceName() (string, error) {
	return pterm.DefaultInteractiveTextInput.
		WithDefaultText("Enter service name").
		Show()
}

// PromptForTemplateType prompts user for template type
func PromptForTemplateType() (string, error) {
	options := []string{"microservice", "frontend", "helm-chart", "api-client"}
	return pterm.DefaultInteractiveSelect.
		WithOptions(options).
		WithDefaultText("Select template type").
		Show()
}

// PromptForPortMapping prompts user for port mapping
func PromptForPortMapping() (string, error) {
	return pterm.DefaultInteractiveTextInput.
		WithDefaultText("Enter port mapping (local:remote)").
		Show()
}