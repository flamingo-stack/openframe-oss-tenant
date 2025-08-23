package certificates

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type CertificateInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func isMkcertInstalled() bool {
	return commandExists("mkcert")
}

func areCertificatesGenerated() bool {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return false
	}

	certDir := filepath.Join(homeDir, ".config", "openframe", "certs")
	certFile := filepath.Join(certDir, "localhost.pem")
	keyFile := filepath.Join(certDir, "localhost-key.pem")

	_, certErr := os.Stat(certFile)
	_, keyErr := os.Stat(keyFile)

	return certErr == nil && keyErr == nil
}

func certificateInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "Certificates: mkcert will be installed via Homebrew and certificates generated automatically"
	case "linux":
		return "Certificates: mkcert will be downloaded and certificates generated automatically"
	case "windows":
		return "Certificates: Please install mkcert manually from https://github.com/FiloSottile/mkcert and run 'mkcert localhost 127.0.0.1'"
	default:
		return "Certificates: Please install mkcert from https://github.com/FiloSottile/mkcert"
	}
}

func NewCertificateInstaller() *CertificateInstaller {
	return &CertificateInstaller{}
}

func (c *CertificateInstaller) IsInstalled() bool {
	// Only check if mkcert is installed, not if certificates exist
	// Certificates will be regenerated on every install command anyway
	return isMkcertInstalled()
}

func (c *CertificateInstaller) GetInstallHelp() string {
	return certificateInstallHelp()
}

func (c *CertificateInstaller) Install() error {
	// First install mkcert if needed
	if !isMkcertInstalled() {
		if err := c.installMkcert(); err != nil {
			return fmt.Errorf("failed to install mkcert: %w", err)
		}
	}

	// Then generate certificates
	return c.generateCertificates()
}

// ForceRegenerate always regenerates certificates even if they exist
func (c *CertificateInstaller) ForceRegenerate() error {
	// Check if mkcert is installed
	if !isMkcertInstalled() {
		return fmt.Errorf("mkcert is not installed")
	}

	// Always regenerate certificates
	return c.generateCertificates()
}

func (c *CertificateInstaller) installMkcert() error {
	switch runtime.GOOS {
	case "darwin":
		return c.installMkcertMacOS()
	case "linux":
		return c.installMkcertLinux()
	case "windows":
		return fmt.Errorf("automatic mkcert installation on Windows not supported. Please install from https://github.com/FiloSottile/mkcert")
	default:
		return fmt.Errorf("automatic mkcert installation not supported on %s", runtime.GOOS)
	}
}

func (c *CertificateInstaller) installMkcertMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic mkcert installation on macOS. Please install brew first: https://brew.sh")
	}

	cmd := exec.Command("brew", "install", "mkcert")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install mkcert: %w", err)
	}

	return nil
}

func (c *CertificateInstaller) installMkcertLinux() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	binDir := filepath.Join(homeDir, "bin")
	if err := os.MkdirAll(binDir, 0755); err != nil {
		return fmt.Errorf("failed to create bin directory: %w", err)
	}

	mkcertPath := filepath.Join(binDir, "mkcert")

	// Download mkcert
	downloadCmd := fmt.Sprintf("curl -fsSL -o %s https://dl.filippo.io/mkcert/latest?for=linux/amd64", mkcertPath)
	if err := c.runShellCommand(downloadCmd); err != nil {
		return fmt.Errorf("failed to download mkcert: %w", err)
	}

	// Make executable
	if err := os.Chmod(mkcertPath, 0755); err != nil {
		return fmt.Errorf("failed to make mkcert executable: %w", err)
	}

	return nil
}

func (c *CertificateInstaller) generateCertificates() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	certDir := filepath.Join(homeDir, ".config", "openframe", "certs")
	if err := os.MkdirAll(certDir, 0755); err != nil {
		return fmt.Errorf("failed to create certificate directory: %w", err)
	}

	// Get CAROOT location
	caRootCmd := exec.Command("mkcert", "-CAROOT")
	caRootOutput, err := caRootCmd.Output()
	if err != nil {
		return fmt.Errorf("failed to get mkcert CAROOT: %w", err)
	}
	caRoot := strings.TrimSpace(string(caRootOutput))

	// Check if CA is already installed (check for CA key)
	rootCAKeyPath := filepath.Join(caRoot, "rootCA-key.pem")
	if _, err := os.Stat(rootCAKeyPath); os.IsNotExist(err) {
		// Install CA with NSS trust stores for browsers - silently
		installCmd := exec.Command("bash", "-c", "TRUST_STORES=nss mkcert -install 2>&1")
		output, err := installCmd.Output()
		if err != nil {
			// Check if it's a password/sudo issue
			if strings.Contains(string(output), "password") || strings.Contains(string(output), "sudo") {
				// Allow interactive password prompt
				installCmd := exec.Command("bash", "-c", "TRUST_STORES=nss mkcert -install")
				installCmd.Stdin = os.Stdin
				installCmd.Stdout = os.Stdout
				installCmd.Stderr = os.Stderr
				if err := installCmd.Run(); err != nil {
					return fmt.Errorf("failed to install mkcert CA: %w", err)
				}
			} else {
				return fmt.Errorf("failed to install mkcert CA: %w", err)
			}
		}
	}

	// Platform-specific trust handling - EXACTLY as in certificates.sh
	switch runtime.GOOS {
	case "darwin":
		// Resolve login keychain
		kcCmd := exec.Command("bash", "-c", `security default-keychain -d user | tr -d '"'`)
		kcOutput, _ := kcCmd.Output()
		keychain := strings.TrimSpace(string(kcOutput))

		// If empty, try default locations
		if keychain == "" || !fileExists(keychain) {
			keychain = filepath.Join(homeDir, "Library/Keychains/login.keychain-db")
			if !fileExists(keychain) {
				// Return empty if not found
				keychain = ""
			}
		}

		if keychain != "" && fileExists(keychain) {
			// Remove old mkcert certificates from keychain
			findCmd := fmt.Sprintf(`security find-certificate -a -c "mkcert" -Z "%s" | awk '/SHA-1 hash:/ {print $3}'`, keychain)
			shaCmd := exec.Command("bash", "-c", findCmd)
			shaOutput, _ := shaCmd.Output()

			if len(shaOutput) > 0 {
				shas := strings.TrimSpace(string(shaOutput))
				for _, sha := range strings.Split(shas, "\n") {
					if sha != "" {
						deleteCmd := exec.Command("security", "delete-certificate", "-Z", sha, keychain)
						deleteCmd.Run() // Best effort
					}
				}
			}

			// Add mkcert CA to login keychain (silently unless password needed)
			rootCAPem := filepath.Join(caRoot, "rootCA.pem")
			trustCmd := exec.Command("security", "add-trusted-cert", "-r", "trustRoot", "-p", "ssl", "-k", keychain, rootCAPem)
			// First try silently
			output, err := trustCmd.CombinedOutput()
			if err != nil {
				outputStr := string(output)
				if strings.Contains(outputStr, "User interaction is not allowed") {
					// Need user interaction - run interactively
					trustCmd = exec.Command("security", "add-trusted-cert", "-r", "trustRoot", "-p", "ssl", "-k", keychain, rootCAPem)
					trustCmd.Stdin = os.Stdin
					trustCmd.Stdout = os.Stdout
					trustCmd.Stderr = os.Stderr
					if err := trustCmd.Run(); err != nil {
						// User likely cancelled - return error to indicate incomplete setup
						return fmt.Errorf("certificate trust was not established (user cancelled or error occurred)")
					}
				} else if strings.Contains(outputStr, "authorization was canceled by the user") {
					return fmt.Errorf("certificate trust was not established (user cancelled or error occurred)")
				}
				// Other errors are non-fatal, continue with certificate generation
			}
		}

	case "linux":
		// Optional: install certutil for browser NSS
		if !commandExists("certutil") {
			if commandExists("apt-get") {
				updateCmd := exec.Command("sudo", "apt-get", "update", "-y")
				updateCmd.Run()
				installCmd := exec.Command("sudo", "apt-get", "install", "-y", "libnss3-tools", "ca-certificates")
				installCmd.Run()
			}
		}

		// Clean old mkcert CA nicknames to avoid duplicates
		if commandExists("certutil") {
			nssDBPaths := []string{
				filepath.Join(homeDir, ".pki/nssdb"),
			}

			// Add Firefox profiles
			firefoxDir := filepath.Join(homeDir, ".mozilla/firefox")
			if entries, err := os.ReadDir(firefoxDir); err == nil {
				for _, entry := range entries {
					if entry.IsDir() {
						nssDBPaths = append(nssDBPaths, filepath.Join(firefoxDir, entry.Name()))
					}
				}
			}

			for _, dbPath := range nssDBPaths {
				certDBPath := filepath.Join(dbPath, "cert9.db")
				if fileExists(certDBPath) {
					listCmd := exec.Command("certutil", "-L", "-d", "sql:"+dbPath)
					output, _ := listCmd.Output()

					lines := strings.Split(string(output), "\n")
					for _, line := range lines {
						if strings.HasPrefix(line, "mkcert ") {
							parts := strings.Fields(line)
							if len(parts) > 0 {
								nick := parts[0]
								deleteCmd := exec.Command("certutil", "-D", "-d", "sql:"+dbPath, "-n", nick)
								deleteCmd.Run() // Best effort
							}
						}
					}
				}
			}
		}

		// Install CA to system + NSS
		installSystemCmd := exec.Command("bash", "-c", "TRUST_STORES=system,nss mkcert -install")
		installSystemCmd.Stdin = os.Stdin
		installSystemCmd.Stdout = os.Stdout
		installSystemCmd.Stderr = os.Stderr
		installSystemCmd.Run()

		// Refresh trust stores
		if commandExists("update-ca-certificates") {
			updateCmd := exec.Command("sudo", "update-ca-certificates")
			updateCmd.Run()
		}
		if commandExists("update-ca-trust") {
			updateCmd := exec.Command("sudo", "update-ca-trust", "extract")
			updateCmd.Run()
		}
	}

	// Generate localhost certificates (silently)
	generateCmd := exec.Command("bash", "-c",
		fmt.Sprintf("cd '%s' && mkcert -cert-file localhost.pem -key-file localhost-key.pem localhost 127.0.0.1 ::1 >/dev/null 2>&1", certDir))
	if err := generateCmd.Run(); err != nil {
		return fmt.Errorf("failed to generate certificates: %w", err)
	}

	return nil
}

func (c *CertificateInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	// Completely silence output during installation
	return cmd.Run()
}

func (c *CertificateInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	// Completely silence output during installation
	return cmd.Run()
}
