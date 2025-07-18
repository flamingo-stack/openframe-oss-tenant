package main

import (
	"fmt"
	"os"

	"openframe/cmd"
)

var (
	version = "dev"
	commit  = "unknown"
	date    = "unknown"
)

func main() {
	// Temporary debug
	debugRoot()

	if err := cmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
