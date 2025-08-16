package scaffold

import "path/filepath"

// TemplateGenerator handles code generation from templates
type TemplateGenerator struct {
	outputDir   string
	interactive bool
}

// NewTemplateGenerator creates a new template generator
func NewTemplateGenerator(outputDir string, interactive bool) *TemplateGenerator {
	return &TemplateGenerator{
		outputDir:   outputDir,
		interactive: interactive,
	}
}

// GenerateFromTemplate generates code from a template
func (t *TemplateGenerator) GenerateFromTemplate(templateType, name string, options map[string]interface{}) error {
	// TODO: Implement template generation
	targetDir := filepath.Join(t.outputDir, name)
	_ = targetDir
	return nil
}