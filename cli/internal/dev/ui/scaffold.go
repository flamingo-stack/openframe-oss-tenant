package ui

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// ServiceSelection represents a selected skaffold service
type ServiceSelection struct {
	ServiceName string
	FilePath    string
	Directory   string
}

// SkaffoldUI handles skaffold configuration discovery and selection
type SkaffoldUI struct {
	verbose bool
}

// NewSkaffoldUI creates a new SkaffoldUI instance
func NewSkaffoldUI(verbose bool) *SkaffoldUI {
	return &SkaffoldUI{
		verbose: verbose,
	}
}

// SkaffoldCategory represents a category of skaffold files
type SkaffoldCategory struct {
	Name  string
	Icon  string
	Files []SkaffoldFile
}

// SkaffoldFile represents a skaffold configuration file
type SkaffoldFile struct {
	ServiceName string
	FilePath    string
}

// ErrNoSkaffoldFiles is returned when no skaffold.yaml files are found
var ErrNoSkaffoldFiles = fmt.Errorf("no skaffold files found")

// DiscoverAndSelectService discovers skaffold files and prompts user to select one
func (su *SkaffoldUI) DiscoverAndSelectService() (*ServiceSelection, error) {
	// Search for skaffold.yaml files recursively in parent directory
	skaffoldFiles := su.findSkaffoldYamlFiles("../")

	if len(skaffoldFiles) == 0 {
		pterm.Warning.Println("No skaffold.yaml files found in project directory")
		pterm.Info.Println("Create a skaffold.yaml file in your service directory to get started.")
		pterm.Info.Println("Examples: https://skaffold.dev/docs/references/yaml/")
		return nil, ErrNoSkaffoldFiles
	}

	// Show success message with count
	pterm.Success.Printf("🎯 Found %d skaffold configuration file(s)\n\n", len(skaffoldFiles))

	// Categorize files for selection (but don't display them)
	categories := su.categorizeSkaffoldFiles(skaffoldFiles)

	// Create options list
	var options []string
	var serviceMap = make(map[string]string)

	for _, category := range categories {
		for _, file := range category.Files {
			displayName := file.ServiceName
			options = append(options, displayName)
			serviceMap[displayName] = file.FilePath
		}
	}

	if len(options) == 0 {
		return nil, fmt.Errorf("no services available for selection")
	}

	// Use shared UI with → arrow support and search filtering
	_, selectedOption, err := sharedUI.SelectFromListWithSearch("Which service would you like to use", options)

	if err != nil {
		return nil, fmt.Errorf("service selection failed: %w", err)
	}

	if selectedOption == "" {
		return nil, fmt.Errorf("no service selected")
	}

	selectedPath, exists := serviceMap[selectedOption]
	if !exists {
		return nil, fmt.Errorf("selected service not found")
	}

	// Extract directory from path
	directory := filepath.Dir(selectedPath)

	return &ServiceSelection{
		ServiceName: selectedOption,
		FilePath:    selectedPath,
		Directory:   directory,
	}, nil
}

// findSkaffoldYamlFiles recursively searches for skaffold.yaml files
func (su *SkaffoldUI) findSkaffoldYamlFiles(rootPath string) []SkaffoldFile {
	var files []SkaffoldFile

	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if su.verbose {
				pterm.Debug.Printf("Error accessing path %s: %v\n", path, err)
			}
			return nil // Continue walking despite errors
		}

		if !info.IsDir() && (info.Name() == "skaffold.yaml" || info.Name() == "skaffold.yml") {
			relPath, err := filepath.Rel(".", path)
			if err != nil {
				relPath = path
			}

			serviceName := su.extractServiceName(relPath)
			files = append(files, SkaffoldFile{
				ServiceName: serviceName,
				FilePath:    relPath,
			})
		}

		return nil
	})

	if err != nil && su.verbose {
		pterm.Debug.Printf("Error walking directory tree: %v\n", err)
	}

	// Sort by service name
	sort.Slice(files, func(i, j int) bool {
		return files[i].ServiceName < files[j].ServiceName
	})

	return files
}

// categorizeSkaffoldFiles organizes skaffold files by their location/purpose
func (su *SkaffoldUI) categorizeSkaffoldFiles(files []SkaffoldFile) []SkaffoldCategory {
	categories := make(map[string]*SkaffoldCategory)

	for _, file := range files {
		var categoryKey, categoryName, categoryIcon string

		if strings.Contains(file.FilePath, "openframe/services") {
			categoryKey = "openframe-services"
			categoryName = "OpenFrame Services"
			categoryIcon = "🏗️ "
		} else if strings.Contains(file.FilePath, "integrated-tools") {
			categoryKey = "integrated-tools"
			categoryName = "Integrated Tools"
			categoryIcon = "🔧 "
		} else if strings.Contains(file.FilePath, "client") {
			categoryKey = "client"
			categoryName = "Client Applications"
			categoryIcon = "💻 "
		} else {
			categoryKey = "other"
			categoryName = "Other Services"
			categoryIcon = "📦 "
		}

		if categories[categoryKey] == nil {
			categories[categoryKey] = &SkaffoldCategory{
				Name:  categoryName,
				Icon:  categoryIcon,
				Files: []SkaffoldFile{},
			}
		}

		categories[categoryKey].Files = append(categories[categoryKey].Files, file)
	}

	// Convert to sorted slice
	var result []SkaffoldCategory
	categoryOrder := []string{"openframe-services", "integrated-tools", "client", "other"}

	for _, key := range categoryOrder {
		if category, exists := categories[key]; exists {
			// Sort files within category
			sort.Slice(category.Files, func(i, j int) bool {
				return category.Files[i].ServiceName < category.Files[j].ServiceName
			})
			result = append(result, *category)
		}
	}

	return result
}

// displayCategorizedFiles shows the skaffold files organized by category
func (su *SkaffoldUI) displayCategorizedFiles(categories []SkaffoldCategory) {
	for _, category := range categories {
		if len(category.Files) == 0 {
			continue
		}

		pterm.Printf("%s%s (%d files)\n", category.Icon, category.Name, len(category.Files))

		for _, file := range category.Files {
			if file.ServiceName != "" {
				pterm.Printf("   • %s %s\n", pterm.Cyan(file.ServiceName), pterm.Gray("("+file.FilePath+")"))
			} else {
				pterm.Printf("   • %s\n", file.FilePath)
			}
		}
		pterm.Println()
	}
}

// extractServiceName extracts a clean service name from the file path
func (su *SkaffoldUI) extractServiceName(filePath string) string {
	parts := strings.Split(filePath, "/")

	// For openframe services: ../openframe/services/openframe-api/skaffold.yaml -> openframe-api
	if len(parts) >= 4 && strings.Contains(filePath, "openframe/services") {
		return parts[len(parts)-2]
	}

	// For integrated tools: ../integrated-tools/authentik/postgresql/skaffold.yaml
	if strings.Contains(filePath, "integrated-tools") {
		// Extract tool and service names based on known patterns
		if strings.Contains(filePath, "authentik/postgresql") {
			return "authentik-postgres"
		}
		if strings.Contains(filePath, "fleetmdm/skaffold.yaml") {
			return "fleetmdm-server"
		}
		if strings.Contains(filePath, "meshcentral/server") {
			return "meshcentral-server"
		}
		if strings.Contains(filePath, "tactical-rmm/tactical-base") {
			return "tactical-base"
		}
		if strings.Contains(filePath, "tactical-rmm/tactical-frontend") {
			return "tactical-frontend"
		}
		if strings.Contains(filePath, "tactical-rmm/tactical-nginx") {
			return "tactical-nginx"
		}

		// Fallback: use the directory containing skaffold.yaml
		if len(parts) >= 2 {
			return parts[len(parts)-2]
		}
	}

	// For other cases, use the parent directory name
	if len(parts) >= 2 {
		return parts[len(parts)-2]
	}

	return ""
}
