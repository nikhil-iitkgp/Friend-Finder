import { getSession } from \"next-auth/react\";
import type { APIResponse } from \"@/lib/validations\";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Network error class
export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

// Request configuration interface
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  requireAuth?: boolean;
}

// Response interface
interface APIResponseWithMeta<T = any> extends APIResponse<T> {
  status: number;
  headers: Headers;
}

/**
 * Base API client with authentication, error handling, and timeout support
 */
class APIClient {
  private baseURL: string;
  private defaultTimeout: number;
  
  constructor(baseURL: string = API_BASE_URL, timeout: number = REQUEST_TIMEOUT) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
  }
  
  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSession();
    const headers: Record<string, string> = {};
    
    if (session?.user) {
      // In a real implementation, you might include a JWT token here
      // For NextAuth, the session is handled via cookies
      headers['X-User-ID'] = session.user.id;
    }
    
    return headers;
  }
  
  /**
   * Create request with timeout support
   */
  private createRequest(url: string, config: RequestConfig): Promise<Response> {
    const controller = new AbortController();
    const timeout = config.timeout || this.defaultTimeout;
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    const requestPromise = fetch(url, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: controller.signal,
    });
    
    return requestPromise.finally(() => {
      clearTimeout(timeoutId);
    });
  }
  
  /**
   * Handle response and extract data
   */
  private async handleResponse<T = any>(response: Response): Promise<APIResponseWithMeta<T>> {
    let data: any;
    
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new APIError(
        'Invalid JSON response from server',
        response.status,
        'INVALID_JSON'
      );
    }
    
    const result: APIResponseWithMeta<T> = {
      success: response.ok,
      data: data?.data || data,
      error: data?.error,
      message: data?.message,
      status: response.status,
      headers: response.headers,
    };
    
    if (!response.ok) {
      throw new APIError(
        data?.error || data?.message || `HTTP ${response.status}`,
        response.status,
        data?.code
      );
    }
    
    return result;
  }
  
  /**
   * Make authenticated or unauthenticated request
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig
  ): Promise<APIResponseWithMeta<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      // Add authentication headers if required
      if (config.requireAuth !== false) {
        const authHeaders = await this.getAuthHeaders();
        config.headers = { ...config.headers, ...authHeaders };
      }
      
      const response = await this.createRequest(url, config);
      return await this.handleResponse<T>(response);
      
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError();
      }
      
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }
      
      throw new APIError(
        error.message || 'An unexpected error occurred',
        500,
        'UNKNOWN_ERROR'
      );
    }
  }
  
  // Convenience methods
  async get<T = any>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'GET',
      requireAuth,
    });
    return response.data;
  }
  
  async post<T = any>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = true
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data,
      requireAuth,
    });
    return response.data;
  }
  
  async put<T = any>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = true
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
      requireAuth,
    });
    return response.data;
  }
  
  async delete<T = any>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
      requireAuth,
    });
    return response.data;
  }
  
  async patch<T = any>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = true
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: data,
      requireAuth,
    });
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export types
export type { RequestConfig, APIResponseWithMeta };

// Utility functions
export const handleAPIError = (error: unknown): string => {
  if (error instanceof APIError) {
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet connection.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export const isAPIError = (error: unknown): error is APIError => {
  return error instanceof APIError;
};

export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError;
};

// Rate limiting helper (client-side)
export class ClientRateLimit {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  clear(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new ClientRateLimit();