package main

import (
	"bytes"
	"os"
	"os/exec"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMainIntegration(t *testing.T) {
	// Build test binary
	testBinary := "openframe-test-main"
	buildCmd := exec.Command("go", "build", "-o", testBinary, ".")
	require.NoError(t, buildCmd.Run())
	defer os.Remove(testBinary)

	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		contains string
	}{
		{
			name:     "help",
			args:     []string{"--help"},
			wantErr:  false,
			contains: "OpenFrame CLI",
		},
		{
			name:     "version",
			args:     []string{"--version"},
			wantErr:  false,
			contains: "dev",
		},
		{
			name:     "invalid flag",
			args:     []string{"--invalid"},
			wantErr:  true,
			contains: "unknown flag",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cmd := exec.Command("./"+testBinary, tc.args...)
			var stdout, stderr bytes.Buffer
			cmd.Stdout = &stdout
			cmd.Stderr = &stderr
			
			err := cmd.Run()
			output := stdout.String() + stderr.String()
			
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Contains(t, output, tc.contains)
		})
	}
}