package memory

import (
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

type MemoryChecker struct{}

const RecommendedMemoryMB = 15360 // 15GB in MB

func NewMemoryChecker() *MemoryChecker {
	return &MemoryChecker{}
}

func (m *MemoryChecker) IsInstalled() bool {
	return m.HasSufficientMemory()
}

func (m *MemoryChecker) GetInstallHelp() string {
	currentMemory := m.getTotalMemoryMB()
	return fmt.Sprintf("Memory: %d MB available, %d MB recommended. Consider adding more RAM or increasing virtual memory", currentMemory, RecommendedMemoryMB)
}

func (m *MemoryChecker) Install() error {
	return fmt.Errorf("memory cannot be automatically installed. Please add more physical RAM or increase virtual memory allocation")
}

func (m *MemoryChecker) HasSufficientMemory() bool {
	totalMemory := m.getTotalMemoryMB()
	return totalMemory >= RecommendedMemoryMB
}

func (m *MemoryChecker) getTotalMemoryMB() int {
	switch runtime.GOOS {
	case "darwin":
		return m.getMacOSMemory()
	case "linux":
		return m.getLinuxMemory()
	case "windows":
		return m.getWindowsMemory()
	default:
		return 0
	}
}

func (m *MemoryChecker) getMacOSMemory() int {
	// Get physical memory
	cmd := exec.Command("sysctl", "hw.memsize")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	// Parse output: "hw.memsize: 34359738368"
	parts := strings.Split(string(output), ":")
	if len(parts) != 2 {
		return 0
	}

	memBytes, err := strconv.ParseInt(strings.TrimSpace(parts[1]), 10, 64)
	if err != nil {
		return 0
	}

	// Convert bytes to MB
	return int(memBytes / 1024 / 1024)
}

func (m *MemoryChecker) getLinuxMemory() int {
	// Read /proc/meminfo
	cmd := exec.Command("cat", "/proc/meminfo")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "MemTotal:") {
			// Parse line: "MemTotal:       16777216 kB"
			fields := strings.Fields(line)
			if len(fields) >= 2 {
				memKB, err := strconv.ParseInt(fields[1], 10, 64)
				if err != nil {
					return 0
				}
				// Convert kB to MB
				return int(memKB / 1024)
			}
		}
	}

	return 0
}

func (m *MemoryChecker) getWindowsMemory() int {
	// Use PowerShell to get total physical memory
	cmd := exec.Command("powershell", "-Command", "Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty TotalPhysicalMemory")
	output, err := cmd.Output()
	if err != nil {
		return 0
	}

	memBytes, err := strconv.ParseInt(strings.TrimSpace(string(output)), 10, 64)
	if err != nil {
		return 0
	}

	// Convert bytes to MB
	return int(memBytes / 1024 / 1024)
}

func (m *MemoryChecker) GetMemoryInfo() (int, int, bool) {
	current := m.getTotalMemoryMB()
	recommended := RecommendedMemoryMB
	sufficient := current >= recommended
	return current, recommended, sufficient
}
