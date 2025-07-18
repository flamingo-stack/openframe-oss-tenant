package app

import (
	"testing"

	"openframe/internal/config"
)

func TestNewServiceLister(t *testing.T) {
	app := &App{}
	lister := NewServiceLister(app)

	if lister == nil {
		t.Fatal("NewServiceLister() returned nil")
	}

	if lister.app != app {
		t.Error("NewServiceLister() should set app reference correctly")
	}
}

func TestListerList(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"microservice-1": {
					Name:      "microservice-1",
					Directory: "/test/dir1",
					Namespace: "microservices",
					Type:      config.ServiceTypeMicroservice,
					Ports:     map[string]int{"http": 8080},
				},
				"integrated-1": {
					Name:      "integrated-1",
					Directory: "/test/dir2",
					Namespace: "integrated-tools",
					Type:      config.ServiceTypeIntegrated,
					Ports:     map[string]int{"http": 3000},
				},
				"datasource-1": {
					Name:      "datasource-1",
					Directory: "/test/dir3",
					Namespace: "datasources",
					Type:      config.ServiceTypeDatasource,
				},
			},
		},
	}

	lister := &ServiceLister{app: app}

	// Test List method with no filtering
	lister.List(false, "")
	// This method doesn't return anything, so we just test it doesn't panic

	// Test List method with detailed output
	lister.List(true, "")
	// This method doesn't return anything, so we just test it doesn't panic

	// Test List method with type filtering
	lister.List(false, "microservice")
	// This method doesn't return anything, so we just test it doesn't panic

	lister.List(false, "integrated")
	// This method doesn't return anything, so we just test it doesn't panic

	lister.List(false, "datasources")
	// This method doesn't return anything, so we just test it doesn't panic
}

func TestListerListJSON(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"microservice-1": {
					Name:      "microservice-1",
					Directory: "/test/dir1",
					Namespace: "microservices",
					Type:      config.ServiceTypeMicroservice,
					Ports:     map[string]int{"http": 8080},
				},
				"integrated-1": {
					Name:      "integrated-1",
					Directory: "/test/dir2",
					Namespace: "integrated-tools",
					Type:      config.ServiceTypeIntegrated,
					Ports:     map[string]int{"http": 3000},
				},
				"datasource-1": {
					Name:      "datasource-1",
					Directory: "/test/dir3",
					Namespace: "datasources",
					Type:      config.ServiceTypeDatasource,
				},
			},
		},
	}

	lister := &ServiceLister{app: app}

	// Test ListJSON method
	err := lister.ListJSON()
	if err != nil {
		t.Errorf("ListJSON() failed: %v", err)
	}
}

func TestPrintServiceGroup(t *testing.T) {
	// Create a mock app
	app := &App{}
	lister := &ServiceLister{app: app}

	// Test with empty services
	lister.printServiceGroup("Empty Group:", []*config.Service{}, false)
	// This method doesn't return anything, so we just test it doesn't panic

	// Test with services
	services := []*config.Service{
		{
			Name:      "test-service-1",
			Directory: "/test/dir1",
			Namespace: "test-namespace",
			Type:      config.ServiceTypeMicroservice,
			Ports:     map[string]int{"http": 8080},
		},
		{
			Name:      "test-service-2",
			Directory: "/test/dir2",
			Namespace: "test-namespace",
			Type:      config.ServiceTypeMicroservice,
		},
	}

	// Test without detailed output
	lister.printServiceGroup("Test Group:", services, false)
	// This method doesn't return anything, so we just test it doesn't panic

	// Test with detailed output
	lister.printServiceGroup("Test Group Detailed:", services, true)
	// This method doesn't return anything, so we just test it doesn't panic
}

func TestListWithEmptyServices(t *testing.T) {
	// Create a mock app with empty services
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{},
		},
	}

	lister := &ServiceLister{app: app}

	// Test List method with empty services
	lister.List(false, "")
	// This method doesn't return anything, so we just test it doesn't panic

	// Test List method with type filter and empty services
	lister.List(false, "microservice")
	// This method doesn't return anything, so we just test it doesn't panic
}

func TestListWithTypeFiltering(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"microservice-1": {
					Name:      "microservice-1",
					Directory: "/test/dir1",
					Namespace: "microservices",
					Type:      config.ServiceTypeMicroservice,
				},
				"integrated-1": {
					Name:      "integrated-1",
					Directory: "/test/dir2",
					Namespace: "integrated-tools",
					Type:      config.ServiceTypeIntegrated,
				},
				"datasource-1": {
					Name:      "datasource-1",
					Directory: "/test/dir3",
					Namespace: "datasources",
					Type:      config.ServiceTypeDatasource,
				},
				"client-tool-1": {
					Name:      "client-tool-1",
					Directory: "/test/dir4",
					Namespace: "client-tools",
					Type:      config.ServiceTypeClientTool,
				},
				"platform-1": {
					Name:      "platform-1",
					Directory: "/test/dir5",
					Namespace: "platform",
					Type:      config.ServiceTypePlatform,
				},
			},
		},
	}

	lister := &ServiceLister{app: app}

	// Test all valid type filters
	validTypes := []string{
		"microservice", "microservices",
		"integrated", "integrated-tools",
		"datasource", "datasources",
		"client-tool", "client-tools",
		"platform",
	}

	for _, serviceType := range validTypes {
		t.Run("type_"+serviceType, func(t *testing.T) {
			lister.List(false, serviceType)
			// This method doesn't return anything, so we just test it doesn't panic
		})
	}
}

func TestServiceListerStructFields(t *testing.T) {
	// Test that ServiceLister struct has all expected fields
	app := &App{}
	lister := &ServiceLister{app: app}

	// Test that app field can be accessed
	if lister.app != app {
		t.Error("app field should be accessible")
	}
}
