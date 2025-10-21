package prerequisites

import (
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/docker"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/k3d"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/kubectl"
)

type PrerequisiteChecker struct {
	requirements []Requirement
}

type Requirement struct {
	Name        string
	Command     string
	IsInstalled func() bool
	InstallHelp func() string
}

func NewPrerequisiteChecker() *PrerequisiteChecker {
	return &PrerequisiteChecker{
		requirements: []Requirement{
			{
				Name:        "Docker",
				Command:     "docker",
				IsInstalled: func() bool { return docker.IsDockerRunning() },
				InstallHelp: func() string {
					if !docker.NewDockerInstaller().IsInstalled() {
						return docker.NewDockerInstaller().GetInstallHelp()
					}
					return "Docker is installed but not running. Please start Docker Desktop or the Docker daemon."
				},
			},
			{
				Name:        "kubectl",
				Command:     "kubectl",
				IsInstalled: func() bool { return kubectl.NewKubectlInstaller().IsInstalled() },
				InstallHelp: func() string { return kubectl.NewKubectlInstaller().GetInstallHelp() },
			},
			{
				Name:        "k3d",
				Command:     "k3d",
				IsInstalled: func() bool { return k3d.NewK3dInstaller().IsInstalled() },
				InstallHelp: func() string { return k3d.NewK3dInstaller().GetInstallHelp() },
			},
		},
	}
}

func (pc *PrerequisiteChecker) CheckAll() (bool, []string) {
	var missing []string
	allPresent := true

	for _, req := range pc.requirements {
		if !req.IsInstalled() {
			missing = append(missing, req.Name)
			allPresent = false
		}
	}

	return allPresent, missing
}

func (pc *PrerequisiteChecker) GetInstallInstructions(missingTools []string) []string {
	var instructions []string

	for _, tool := range missingTools {
		for _, req := range pc.requirements {
			if strings.EqualFold(req.Name, tool) {
				instructions = append(instructions, req.InstallHelp())
				break
			}
		}
	}

	return instructions
}

func CheckPrerequisites() error {
	installer := NewInstaller()
	return installer.CheckAndInstall()
}
