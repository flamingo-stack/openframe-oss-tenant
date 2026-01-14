
/**
 * Extracts error message from API response or error object
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}

/**
 * Handles API errors and shows toast notification
 * Use this in React Query mutation onError callbacks
 */
export function handleApiError(
  error: unknown,
  toast: (options: { title: string; description: string; variant: 'destructive' }) => void,
  defaultMessage: string = 'Operation failed'
): void {
  const message = getErrorMessage(error)
  
  toast({
    title: defaultMessage,
    description: message,
    variant: 'destructive',
  })
}
