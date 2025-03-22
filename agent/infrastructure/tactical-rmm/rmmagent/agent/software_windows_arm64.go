// Software implementation for Windows ARM64

package agent

// Software represents an installed software package
type Software struct {
	Name      string
	Version   string
	Publisher string
}

// GetInstalledSoftware returns a list of installed software on Windows ARM64
func (a *Agent) GetInstalledSoftware() ([]Software, error) {
	// Initially return empty slice for successful compilation
	// Future versions can implement actual software detection
	return []Software{}, nil
}
