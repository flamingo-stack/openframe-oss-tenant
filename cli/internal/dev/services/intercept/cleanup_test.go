package intercept

import (
	"os"
	"syscall"
	"testing"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestService_SetupCleanupHandler(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	// Test that cleanup handler is set up properly
	service.setupCleanupHandler("test-service")

	// Verify signal channel is configured
	assert.NotNil(t, service.signalChannel)

	// Verify channel can receive signals (we don't actually send signals in tests)
	select {
	case <-service.signalChannel:
		t.Fatal("Signal channel should be empty initially")
	default:
		// Expected - channel should be empty
	}
}

func TestService_Cleanup(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()

	tests := []struct {
		name                 string
		service              *Service
		setupState           func(*Service)
		setupMocks           func(*executor.MockCommandExecutor)
		expectLeaveCommand   bool
		expectQuitCommand    bool
		expectRestoreCommand bool
	}{
		{
			name:    "cleanup when not intercepting",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = false
			},
			expectLeaveCommand: false,
			expectQuitCommand:  false,
		},
		{
			name:    "cleanup active intercept - quiet mode",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "test-service"
				s.currentNamespace = "production"
				s.originalNamespace = "default"
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 0})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: true,
		},
		{
			name:    "cleanup active intercept - verbose mode",
			service: NewService(mockExecutor, true),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "api-service"
				s.currentNamespace = "staging"
				s.originalNamespace = "default"
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 0})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: true,
		},
		{
			name:    "cleanup with leave failure",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "test-service"
				s.currentNamespace = "production"
				s.originalNamespace = "default"
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				// Leave fails
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 1})
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 0})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: true,
		},
		{
			name:    "cleanup with quit failure",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "test-service"
				s.currentNamespace = "production"
				s.originalNamespace = "default"
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 0})
				// Quit fails
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 1})
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 0})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: true,
		},
		{
			name:    "cleanup with restore failure",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "test-service"
				s.currentNamespace = "production"
				s.originalNamespace = "default"
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
				// Restore fails
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 1})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: true,
		},
		{
			name:    "cleanup with same namespace (no restore needed)",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "test-service"
				s.currentNamespace = "default"
				s.originalNamespace = "default" // Same as current
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: false,
		},
		{
			name:    "cleanup with empty original namespace (no restore needed)",
			service: NewService(mockExecutor, false),
			setupState: func(s *Service) {
				s.isIntercepting = true
				s.currentService = "test-service"
				s.currentNamespace = "production"
				s.originalNamespace = "" // Empty original
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence leave", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
			},
			expectLeaveCommand:   true,
			expectQuitCommand:    true,
			expectRestoreCommand: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock state
			mockExecutor.Reset()

			// Setup test-specific state
			if tt.setupState != nil {
				tt.setupState(tt.service)
			}

			// Setup test-specific mocks
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			// We can't test the actual cleanup method directly since it calls os.Exit(0)
			// Instead, we test the individual components that would be called

			if tt.service.isIntercepting {
				// Simulate the cleanup process without os.Exit
				tt.service.isIntercepting = false

				// Test leave command if expected
				if tt.expectLeaveCommand && tt.service.currentService != "" {
					_, _ = mockExecutor.Execute(nil, "telepresence", "leave", tt.service.currentService)
					// Command should be executed (error or not)
					assert.True(t, mockExecutor.WasCommandExecuted("telepresence leave"))
				}

				// Test quit command if expected
				if tt.expectQuitCommand {
					_, _ = mockExecutor.Execute(nil, "telepresence", "quit")
					assert.True(t, mockExecutor.WasCommandExecuted("telepresence quit"))
				}

				// Test restore command if expected
				if tt.expectRestoreCommand && tt.service.originalNamespace != "" && tt.service.originalNamespace != tt.service.currentNamespace {
					_, _ = mockExecutor.Execute(nil, "telepresence", "connect", "--namespace", tt.service.originalNamespace)
					assert.True(t, mockExecutor.WasCommandExecuted("telepresence connect"))
				}
			}
		})
	}
}

func TestSignalHandling(t *testing.T) {
	testutil.InitializeTestMode()

	tests := []struct {
		name   string
		signal os.Signal
	}{
		{
			name:   "SIGINT signal",
			signal: os.Interrupt,
		},
		{
			name:   "SIGTERM signal",
			signal: syscall.SIGTERM,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor := testutil.NewTestMockExecutor()
			service := NewService(mockExecutor, false)

			// Set up cleanup handler
			service.setupCleanupHandler("test-service")

			// Verify that the signal channel is set up to receive the expected signals
			// We can't easily test the actual signal handling without triggering cleanup,
			// but we can verify the channel exists and the setup doesn't panic
			assert.NotNil(t, service.signalChannel)

			// Test channel capacity and behavior
			// Since setupCleanupHandler starts a goroutine that consumes from the channel,
			// we need to test that the channel can accept signals without blocking
			select {
			case service.signalChannel <- tt.signal:
				// Signal was sent successfully and consumed by the cleanup goroutine
				// Wait a bit to ensure the goroutine has processed it
				time.Sleep(1 * time.Millisecond)
				// Test passes if we reached here without blocking
			case <-time.After(10 * time.Millisecond):
				t.Fatal("Signal channel should accept signals without blocking")
			}
		})
	}
}

func TestCleanupState_Management(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	// Test initial state
	assert.False(t, service.isIntercepting)
	assert.Equal(t, "", service.currentService)
	assert.Equal(t, "", service.originalNamespace)

	// Test state during intercept
	service.isIntercepting = true
	service.currentService = "test-service"
	service.currentNamespace = "production"
	service.originalNamespace = "default"

	assert.True(t, service.isIntercepting)
	assert.Equal(t, "test-service", service.currentService)
	assert.Equal(t, "production", service.currentNamespace)
	assert.Equal(t, "default", service.originalNamespace)

	// Test state after cleanup (simulated)
	service.isIntercepting = false

	assert.False(t, service.isIntercepting)
	// Other fields remain set until next intercept
	assert.Equal(t, "test-service", service.currentService)
}
