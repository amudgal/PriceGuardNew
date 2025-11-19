/**
 * API Configuration
 * 
 * This file centralizes API endpoint configuration for the application.
 * It handles both development and production environments, with automatic
 * detection of HTTPS vs HTTP based on the environment.
 */

/**
 * Get the base API URL
 * 
 * Priority:
 * 1. VITE_API_BASE_URL environment variable (set in Netlify)
 * 2. Production domain: api.priceguardbackend.live (if available)
 * 3. Auto-detect from window location (production HTTPS → ALB HTTPS)
 * 4. Fallback to localhost for development
 */
export function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use it
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (envUrl) {
    return envUrl;
  }

  // Auto-detect for production: if frontend is HTTPS, use HTTPS backend
  if (typeof window !== 'undefined') {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';

    if (isProduction && isHttps) {
      // Production HTTPS: Use custom domain first, then fallback to ALB
      // Custom domain: api.priceguardbackend.live
      return 'https://api.priceguardbackend.live';
    }

    if (isProduction && !isHttps) {
      // Production HTTP: Use custom domain (shouldn't happen but fallback)
      return 'http://api.priceguardbackend.live';
    }
  }

  // Development: Use localhost
  return 'http://localhost:4000';
}

/**
 * API Base URL - Use this constant throughout the app
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Helper function to build full API endpoint URL
 */
export function apiEndpoint(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash from base URL if present
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  
  return `${baseUrl}${normalizedPath}`;
}

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  auth: {
    login: () => apiEndpoint('/api/auth/login'),
    register: () => apiEndpoint('/api/auth/register'),
  },
  billing: {
    createSetupIntent: () => apiEndpoint('/api/billing/create-setup-intent'),
    savePaymentMethod: () => apiEndpoint('/api/billing/save-payment-method'),
    createSubscription: () => apiEndpoint('/api/billing/create-subscription'),
    cancelSubscription: () => apiEndpoint('/api/billing/cancel-subscription'),
    subscription: (email: string) =>
      apiEndpoint(`/api/billing/subscription?email=${encodeURIComponent(email)}`),
    billingHistory: (email: string) =>
      apiEndpoint(`/api/billing/billing-history?email=${encodeURIComponent(email)}`),
  },
      products: {
        list: (email: string) =>
          apiEndpoint(`/api/products?email=${encodeURIComponent(email)}`),
        create: () => apiEndpoint('/api/products'),
        update: (id: string) => apiEndpoint(`/api/products/${id}`),
        delete: (id: string, email: string) =>
          apiEndpoint(`/api/products/${id}?email=${encodeURIComponent(email)}`),
      },
      paypal: {
        createOrder: () => apiEndpoint('/api/paypal/create-order'),
        captureOrder: () => apiEndpoint('/api/paypal/capture-order'),
        createSubscription: () => apiEndpoint('/api/paypal/create-subscription'),
        getSubscription: (id: string) => apiEndpoint(`/api/paypal/subscription/${id}`),
        cancelSubscription: () => apiEndpoint('/api/paypal/cancel-subscription'),
      },
      health: () => apiEndpoint('/health'),
    } as const;
