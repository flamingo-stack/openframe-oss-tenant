const createApiClient = () => ({
  get: async <T>(url: string): Promise<T> => {
    const response = await fetch(`/api${url}`, {
      method: 'GET',
      credentials: 'include', // Include HTTP-only cookies
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  },

  post: async <T>(url: string, data: unknown): Promise<T> => {
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      credentials: 'include', // Include HTTP-only cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  },

  patch: async <T>(url: string, data: unknown): Promise<T> => {
    const response = await fetch(`/api${url}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  },

  put: async <T>(url: string, data: unknown): Promise<T> => {
    const response = await fetch(`/api${url}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  },

  delete: async <T>(url: string): Promise<T> => {
    const response = await fetch(`/api${url}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return response.json()
  }
})

// No need to pass tokens - cookies handle auth automatically
export const apiClient = createApiClient()