package intercept

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pterm/pterm"
)

// setupCleanupHandler sets up signal handling for graceful cleanup
func (s *Service) setupCleanupHandler(serviceName string) {
	signal.Notify(s.signalChannel, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-s.signalChannel
		if s.verbose {
			pterm.Info.Println("Received interrupt signal, cleaning up...")
		}
		s.cleanup()
	}()
}

// cleanup performs cleanup operations when intercept is stopped
func (s *Service) cleanup() {
	if !s.isIntercepting {
		return // Nothing to clean up
	}

	fmt.Println("\nCleaning up intercept: " + s.currentService)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	s.isIntercepting = false

	// Leave the intercept (using 'leave' like original script)
	if s.currentService != "" {
		if _, err := s.executor.Execute(ctx, "telepresence", "leave", s.currentService); err != nil {
			pterm.Warning.Printf("Failed to leave intercept: %v\n", err)
		} else if s.verbose {
			pterm.Success.Printf("Left intercept for service: %s\n", s.currentService)
		}
	}

	fmt.Println("Quitting Telepresence daemon")
	if _, err := s.executor.Execute(ctx, "telepresence", "quit"); err != nil {
		pterm.Warning.Printf("Failed to quit telepresence: %v\n", err)
	} else if s.verbose {
		pterm.Success.Println("Telepresence daemon stopped")
	}

	// Restore original namespace
	if s.originalNamespace != "" && s.originalNamespace != s.currentNamespace {
		fmt.Printf("Restoring original namespace: %s\n", s.originalNamespace)
		if _, err := s.executor.Execute(ctx, "telepresence", "connect", "--namespace", s.originalNamespace); err != nil {
			pterm.Warning.Printf("Failed to restore original namespace: %v\n", err)
		} else if s.verbose {
			pterm.Success.Printf("Restored namespace: %s\n", s.originalNamespace)
		}
	}

	os.Exit(0)
}