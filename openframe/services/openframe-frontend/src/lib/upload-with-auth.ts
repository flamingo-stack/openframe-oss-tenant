import { useCallback, useState } from 'react';
import { runtimeEnv } from './runtime-config';

/**
 * Upload a file with authentication (cookies + optional auth headers)
 */
export async function uploadWithAuth(endpoint: string, file: File, fieldName: string = 'file'): Promise<string> {
  const formData = new FormData();
  formData.append(fieldName, file);

  const headers: Record<string, string> = {};

  if (runtimeEnv.enableDevTicketObserver()) {
    try {
      const accessToken = localStorage.getItem('of_access_token');
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (_error) {
      // Silently continue without token
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/api')
      ? `${runtimeEnv.tenantHostUrl()}${endpoint}`
      : `${runtimeEnv.tenantHostUrl()}/api${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Upload failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();

  const uploadedUrl =
    data.url ||
    data.imageUrl ||
    data.file_url ||
    (data.data && data.data.url) ||
    (data.data && data.data.imageUrl) ||
    (data.image && data.image.imageUrl);

  if (!uploadedUrl) {
    throw new Error('No URL returned in upload response');
  }

  return uploadedUrl;
}

/**
 * Delete a file with authentication (cookies + optional auth headers)
 */
export async function deleteWithAuth(endpoint: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (runtimeEnv.enableDevTicketObserver()) {
    try {
      const accessToken = localStorage.getItem('of_access_token');
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (_error) {
      // Silently continue without token
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/api')
      ? `${runtimeEnv.tenantHostUrl()}${endpoint}`
      : `${runtimeEnv.tenantHostUrl()}/api${endpoint}`;

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Delete failed (${response.status}): ${errorText || response.statusText}`);
  }
}

/**
 * Hook to handle file uploads with authentication
 * Returns upload function and loading state
 */
export function useAuthenticatedUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (endpoint: string, file: File, fieldName?: string): Promise<string | null> => {
    setIsUploading(true);
    setError(null);

    try {
      const url = await uploadWithAuth(endpoint, file, fieldName);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
}
