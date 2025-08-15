package cluster

// CreateDefaultManager creates a manager without providers registered
// Note: Provider registration should be done by the caller to avoid import cycles
func CreateDefaultManager() *Manager {
	return NewManager()
}

