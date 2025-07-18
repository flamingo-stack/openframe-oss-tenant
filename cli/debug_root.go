package main

import (
	"fmt"
	"openframe/internal/utils"
	"os"
)

func debugRoot() {
	fmt.Printf("Current working directory: %s\n", getCurrentDir())

	rootDir, err := utils.FindRootDir()
	if err != nil {
		fmt.Printf("Error finding root dir: %v\n", err)
		return
	}

	fmt.Printf("Found root directory: %s\n", rootDir)

	// Test if it's actually a project root
	isRoot := utils.IsProjectRoot(rootDir)
	fmt.Printf("Is project root: %t\n", isRoot)

	// Test current directory
	isCurrentRoot := utils.IsProjectRoot(getCurrentDir())
	fmt.Printf("Is current directory root: %t\n", isCurrentRoot)
}

func getCurrentDir() string {
	dir, err := os.Getwd()
	if err != nil {
		return "error getting current dir"
	}
	return dir
}
