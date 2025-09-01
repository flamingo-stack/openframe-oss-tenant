package kubectl

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestServiceJSON_UnmarshalJSON(t *testing.T) {
	// Test that our JSON structures can properly unmarshal real kubectl output

	t.Run("single service JSON", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "test-service",
    "namespace": "default"
  },
  "spec": {
    "type": "ClusterIP",
    "ports": [
      {
        "name": "http",
        "port": 8080,
        "protocol": "TCP",
        "targetPort": "8080"
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "test-service", service.Metadata.Name)
		assert.Equal(t, "default", service.Metadata.Namespace)
		assert.Equal(t, "ClusterIP", service.Spec.Type)
		assert.Equal(t, 1, len(service.Spec.Ports))
		assert.Equal(t, "http", service.Spec.Ports[0].Name)
		assert.Equal(t, int32(8080), service.Spec.Ports[0].Port)
		assert.Equal(t, "TCP", service.Spec.Ports[0].Protocol)
		assert.Equal(t, "8080", service.Spec.Ports[0].TargetPort)
	})

	t.Run("service with multiple ports", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "multi-port-service"
  },
  "spec": {
    "type": "NodePort",
    "ports": [
      {
        "name": "http",
        "port": 80,
        "protocol": "TCP",
        "targetPort": "8080"
      },
      {
        "name": "https",
        "port": 443,
        "protocol": "TCP",
        "targetPort": "8443"
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "multi-port-service", service.Metadata.Name)
		assert.Equal(t, "NodePort", service.Spec.Type)
		assert.Equal(t, 2, len(service.Spec.Ports))
		
		// First port
		assert.Equal(t, "http", service.Spec.Ports[0].Name)
		assert.Equal(t, int32(80), service.Spec.Ports[0].Port)
		assert.Equal(t, "TCP", service.Spec.Ports[0].Protocol)
		
		// Second port
		assert.Equal(t, "https", service.Spec.Ports[1].Name)
		assert.Equal(t, int32(443), service.Spec.Ports[1].Port)
		assert.Equal(t, "TCP", service.Spec.Ports[1].Protocol)
	})

	t.Run("service with numeric targetPort", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "numeric-target-service"
  },
  "spec": {
    "type": "ClusterIP",
    "ports": [
      {
        "name": "api",
        "port": 9000,
        "protocol": "TCP",
        "targetPort": 9000
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "numeric-target-service", service.Metadata.Name)
		assert.Equal(t, int32(9000), service.Spec.Ports[0].Port)
		// targetPort should be stored as interface{} - could be string or number
		assert.NotNil(t, service.Spec.Ports[0].TargetPort)
	})

	t.Run("service with unnamed port", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "unnamed-port-service"
  },
  "spec": {
    "type": "ClusterIP",
    "ports": [
      {
        "port": 5432,
        "protocol": "TCP",
        "targetPort": "5432"
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "unnamed-port-service", service.Metadata.Name)
		assert.Equal(t, "", service.Spec.Ports[0].Name) // Empty name
		assert.Equal(t, int32(5432), service.Spec.Ports[0].Port)
		assert.Equal(t, "TCP", service.Spec.Ports[0].Protocol)
	})
}

func TestServiceListJSON_UnmarshalJSON(t *testing.T) {
	// Test that service list JSON can be properly unmarshaled

	t.Run("multiple services list", func(t *testing.T) {
		jsonInput := `{
  "items": [
    {
      "metadata": {
        "name": "service-1"
      },
      "spec": {
        "type": "ClusterIP",
        "ports": [
          {
            "name": "http",
            "port": 8080,
            "protocol": "TCP",
            "targetPort": "8080"
          }
        ]
      }
    },
    {
      "metadata": {
        "name": "service-2"
      },
      "spec": {
        "type": "NodePort",
        "ports": [
          {
            "name": "web",
            "port": 80,
            "protocol": "TCP",
            "targetPort": "3000"
          }
        ]
      }
    }
  ]
}`

		var serviceList serviceListJSON
		err := json.Unmarshal([]byte(jsonInput), &serviceList)
		
		assert.NoError(t, err)
		assert.Equal(t, 2, len(serviceList.Items))
		
		// First service
		assert.Equal(t, "service-1", serviceList.Items[0].Metadata.Name)
		assert.Equal(t, "ClusterIP", serviceList.Items[0].Spec.Type)
		assert.Equal(t, "http", serviceList.Items[0].Spec.Ports[0].Name)
		
		// Second service
		assert.Equal(t, "service-2", serviceList.Items[1].Metadata.Name)
		assert.Equal(t, "NodePort", serviceList.Items[1].Spec.Type)
		assert.Equal(t, "web", serviceList.Items[1].Spec.Ports[0].Name)
	})

	t.Run("empty services list", func(t *testing.T) {
		jsonInput := `{
  "items": []
}`

		var serviceList serviceListJSON
		err := json.Unmarshal([]byte(jsonInput), &serviceList)
		
		assert.NoError(t, err)
		assert.Equal(t, 0, len(serviceList.Items))
	})

	t.Run("malformed JSON", func(t *testing.T) {
		jsonInput := `{"invalid": json}`

		var serviceList serviceListJSON
		err := json.Unmarshal([]byte(jsonInput), &serviceList)
		
		assert.Error(t, err)
	})
}

func TestServiceJSON_RealWorldExamples(t *testing.T) {
	// Test with realistic service configurations that kubectl would return

	t.Run("typical web application", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "webapp",
    "namespace": "production"
  },
  "spec": {
    "type": "LoadBalancer",
    "ports": [
      {
        "name": "http",
        "port": 80,
        "protocol": "TCP",
        "targetPort": "http"
      },
      {
        "name": "https",
        "port": 443,
        "protocol": "TCP", 
        "targetPort": "https"
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "webapp", service.Metadata.Name)
		assert.Equal(t, "production", service.Metadata.Namespace)
		assert.Equal(t, "LoadBalancer", service.Spec.Type)
		assert.Equal(t, 2, len(service.Spec.Ports))
	})

	t.Run("database service", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "postgres",
    "namespace": "database"
  },
  "spec": {
    "type": "ClusterIP",
    "ports": [
      {
        "name": "postgresql",
        "port": 5432,
        "protocol": "TCP",
        "targetPort": 5432
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "postgres", service.Metadata.Name)
		assert.Equal(t, "database", service.Metadata.Namespace)
		assert.Equal(t, "ClusterIP", service.Spec.Type)
		assert.Equal(t, "postgresql", service.Spec.Ports[0].Name)
		assert.Equal(t, int32(5432), service.Spec.Ports[0].Port)
	})

	t.Run("headless service", func(t *testing.T) {
		jsonInput := `{
  "metadata": {
    "name": "headless-svc",
    "namespace": "default"
  },
  "spec": {
    "type": "ClusterIP",
    "ports": [
      {
        "name": "peer",
        "port": 2380,
        "protocol": "TCP",
        "targetPort": "peer"
      },
      {
        "name": "client",
        "port": 2379,
        "protocol": "TCP",
        "targetPort": "client"
      }
    ]
  }
}`

		var service serviceJSON
		err := json.Unmarshal([]byte(jsonInput), &service)
		
		assert.NoError(t, err)
		assert.Equal(t, "headless-svc", service.Metadata.Name)
		assert.Equal(t, 2, len(service.Spec.Ports))
		assert.Equal(t, "peer", service.Spec.Ports[0].Name)
		assert.Equal(t, "client", service.Spec.Ports[1].Name)
	})
}