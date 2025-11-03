//go:build !windows

package kubectl

import "fmt"

// installWindows is a stub for non-Windows platforms
func (k *KubectlInstaller) installWindows() error {
	return fmt.Errorf("Windows installation is only supported on Windows")
}
