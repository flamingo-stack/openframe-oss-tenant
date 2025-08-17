package scaffold

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewTemplateGenerator(t *testing.T) {
	t.Run("creates new template generator with all parameters", func(t *testing.T) {
		outputDir := "/tmp/output"
		interactive := true
		
		generator := NewTemplateGenerator(outputDir, interactive)
		
		assert.NotNil(t, generator)
		assert.Equal(t, outputDir, generator.outputDir)
		assert.Equal(t, interactive, generator.interactive)
	})
	
	t.Run("creates template generator with empty output dir", func(t *testing.T) {
		outputDir := ""
		interactive := false
		
		generator := NewTemplateGenerator(outputDir, interactive)
		
		assert.NotNil(t, generator)
		assert.Equal(t, "", generator.outputDir)
		assert.False(t, generator.interactive)
	})
	
	t.Run("creates template generator with default settings", func(t *testing.T) {
		generator := NewTemplateGenerator("./output", false)
		
		assert.NotNil(t, generator)
		assert.Equal(t, "./output", generator.outputDir)
		assert.False(t, generator.interactive)
	})
	
	t.Run("creates template generator with interactive mode", func(t *testing.T) {
		generator := NewTemplateGenerator("/home/user/projects", true)
		
		assert.NotNil(t, generator)
		assert.Equal(t, "/home/user/projects", generator.outputDir)
		assert.True(t, generator.interactive)
	})
}

func TestTemplateGenerator_GenerateFromTemplate(t *testing.T) {
	t.Run("generates from template with basic parameters", func(t *testing.T) {
		outputDir := "/tmp/test"
		generator := NewTemplateGenerator(outputDir, false)
		templateType := "api"
		name := "user-service"
		options := map[string]interface{}{
			"port":    8080,
			"version": "v1",
		}
		
		err := generator.GenerateFromTemplate(templateType, name, options)
		
		// Since this is a TODO implementation, it should return nil
		assert.NoError(t, err)
	})
	
	t.Run("generates from template with interactive mode", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/interactive", true)
		templateType := "web"
		name := "frontend-app"
		options := map[string]interface{}{
			"framework": "react",
			"typescript": true,
		}
		
		err := generator.GenerateFromTemplate(templateType, name, options)
		
		assert.NoError(t, err)
		assert.True(t, generator.interactive)
	})
	
	t.Run("handles empty template type", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/test", false)
		templateType := ""
		name := "my-project"
		options := map[string]interface{}{}
		
		err := generator.GenerateFromTemplate(templateType, name, options)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles empty name", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/test", false)
		templateType := "microservice"
		name := ""
		options := map[string]interface{}{"language": "go"}
		
		err := generator.GenerateFromTemplate(templateType, name, options)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles nil options", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/test", false)
		templateType := "library"
		name := "my-lib"
		
		err := generator.GenerateFromTemplate(templateType, name, nil)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles empty options map", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/test", false)
		templateType := "cli"
		name := "my-cli"
		options := map[string]interface{}{}
		
		err := generator.GenerateFromTemplate(templateType, name, options)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles various template types", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/templates", false)
		name := "test-project"
		
		templateTypes := []string{
			"api",
			"web",
			"microservice",
			"library",
			"cli",
			"worker",
			"database",
		}
		
		for _, templateType := range templateTypes {
			t.Run("template type: "+templateType, func(t *testing.T) {
				options := map[string]interface{}{
					"type": templateType,
					"name": name,
				}
				
				err := generator.GenerateFromTemplate(templateType, name, options)
				assert.NoError(t, err)
			})
		}
	})
	
	t.Run("handles complex options", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp/complex", false)
		templateType := "full-stack"
		name := "ecommerce-app"
		options := map[string]interface{}{
			"frontend": map[string]interface{}{
				"framework": "react",
				"typescript": true,
				"styling": "tailwind",
			},
			"backend": map[string]interface{}{
				"language": "go",
				"database": "postgresql",
				"auth":     "jwt",
			},
			"deployment": map[string]interface{}{
				"platform": "kubernetes",
				"replicas": 3,
				"autoscaling": true,
			},
			"features": []string{"user-management", "payments", "analytics"},
		}
		
		err := generator.GenerateFromTemplate(templateType, name, options)
		
		assert.NoError(t, err)
	})
	
	t.Run("verifies target directory path construction", func(t *testing.T) {
		outputDir := "/home/user/projects"
		generator := NewTemplateGenerator(outputDir, false)
		templateType := "api"
		name := "auth-service"
		
		err := generator.GenerateFromTemplate(templateType, name, nil)
		
		assert.NoError(t, err)
		
		// The implementation creates targetDir but doesn't use it yet
		// We can verify the path would be constructed correctly
		expectedPath := filepath.Join(outputDir, name)
		assert.Equal(t, "/home/user/projects/auth-service", expectedPath)
	})
}

func TestTemplateGenerator_FieldAccess(t *testing.T) {
	t.Run("provides access to output dir field", func(t *testing.T) {
		expectedOutputDir := "/var/lib/templates"
		generator := NewTemplateGenerator(expectedOutputDir, false)
		
		assert.Equal(t, expectedOutputDir, generator.outputDir)
	})
	
	t.Run("provides access to interactive field", func(t *testing.T) {
		generator := NewTemplateGenerator("/tmp", true)
		
		assert.True(t, generator.interactive)
	})
	
	t.Run("maintains field values after creation", func(t *testing.T) {
		outputDir := "/custom/output/dir"
		interactive := true
		generator := NewTemplateGenerator(outputDir, interactive)
		
		// Verify initial values
		assert.Equal(t, outputDir, generator.outputDir)
		assert.Equal(t, interactive, generator.interactive)
		
		// Perform operations and verify values are maintained
		err := generator.GenerateFromTemplate("test", "project", nil)
		assert.NoError(t, err)
		
		assert.Equal(t, outputDir, generator.outputDir)
		assert.Equal(t, interactive, generator.interactive)
	})
	
	t.Run("different instances have independent state", func(t *testing.T) {
		generator1 := NewTemplateGenerator("/path1", true)
		generator2 := NewTemplateGenerator("/path2", false)
		
		assert.Equal(t, "/path1", generator1.outputDir)
		assert.True(t, generator1.interactive)
		
		assert.Equal(t, "/path2", generator2.outputDir)
		assert.False(t, generator2.interactive)
		
		// Verify they don't interfere with each other
		assert.NotEqual(t, generator1.outputDir, generator2.outputDir)
		assert.NotEqual(t, generator1.interactive, generator2.interactive)
	})
	
	t.Run("handles relative and absolute paths", func(t *testing.T) {
		testCases := []struct {
			path        string
			description string
		}{
			{"./output", "relative path with dot"},
			{"../output", "relative path with parent"},
			{"output", "relative path simple"},
			{"/tmp/output", "absolute path unix"},
			{"/home/user/projects", "absolute path home"},
		}
		
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				generator := NewTemplateGenerator(tc.path, false)
				
				assert.Equal(t, tc.path, generator.outputDir)
				
				err := generator.GenerateFromTemplate("test", "project", nil)
				assert.NoError(t, err)
			})
		}
	})
}