import { AxiosError } from 'axios';
import {
  apiClient,
  setStoredToken,
  setStoredUser,
  clearAuth,
  getStoredToken,
  getStoredUser,
} from './client';

export type UserRole = 'customer' | 'provider' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
  provider_profile?: {
    id: number;
    user_id: number;
    business_name: string;
    description: string;
    experience_years: number;
    location: string;
    availability_status: string;
    verification_status: string;
    cv_original_name?: string | null;
    certificate_original_name?: string | null;
    has_cv?: boolean;
    has_certificate?: boolean;
    rejection_reason?: string | null;
  } | null;
}

export interface RegisterCustomerData {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: 'customer';
}

export interface RegisterProviderData {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: 'provider';
  business_name: string;
  description: string;
  experience_years: number;
  location: string;
  cv?: File | null;
  certificate?: File | null;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ApiErrorResult {
  message: string;
  errors?: Record<string, string[]>;
}

// Convert Axios errors into safe, human-readable error messages
export function formatApiError(error: unknown, defaultMessage = 'An unexpected error occurred. Please try again.'): ApiErrorResult {
  if (error instanceof AxiosError) {
    if (!error.response) {
      return {
        message: 'Network connection error. Please ensure the backend server is running.',
      };
    }

    const data = error.response.data as any;
    const status = error.response.status;

    if (status === 422) {
      const errorsObj = (data?.errors && typeof data.errors === 'object')
        ? (data.errors as Record<string, string[]>)
        : {};
      const firstFieldError = Object.values(errorsObj)
        .flat()
        .find((m) => typeof m === 'string' && m.length > 0);
      return {
        message: firstFieldError || data?.message || 'Validation failed. Please verify your inputs.',
        errors: errorsObj,
      };
    }

    if (status === 413) {
      return {
        message: 'The uploaded file is too large for the server limit. Please upload a smaller PDF.',
      };
    }

    if (status === 401) {
      return {
        message: data?.message || 'Invalid email or password.',
      };
    }

    if (status === 403) {
      return {
        message: data?.message || 'You do not have permission to access this resource.',
      };
    }

    if (status === 409) {
      return {
        message: data?.message || 'A conflict occurred with your request.',
      };
    }

    if (status >= 500) {
      return {
        message: 'The server encountered an error. Please try again later.',
      };
    }

    if (data?.message && typeof data.message === 'string') {
      return { message: data.message };
    }
  }

  return { message: defaultMessage };
}

// Authentication API methods
export async function registerUser(payload: RegisterCustomerData | RegisterProviderData | FormData): Promise<AuthResponse> {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  const response = await apiClient.post<AuthResponse>('/register', payload, config);
  if (response.data.token) {
    setStoredToken(response.data.token);
    setStoredUser(response.data.user);
  }
  return response.data;
}

export async function uploadProviderCv(
  file: File
): Promise<{ message: string; data?: User['provider_profile'] }> {
  const formData = new FormData();
  formData.append('cv', file);
  const response = await apiClient.post<{ message: string; data?: User['provider_profile'] }>(
    '/provider/cv',
    formData
  );
  return response.data;
}

export async function loginUser(payload: LoginData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/login', payload);
  if (response.data.token) {
    setStoredToken(response.data.token);
    setStoredUser(response.data.user);
  }
  return response.data;
}

export async function logoutUser(): Promise<{ message: string }> {
  try {
    const response = await apiClient.post<{ message: string }>('/logout');
    clearAuth();
    return response.data;
  } catch (error) {
    clearAuth();
    throw error;
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ user: User }>('/me');
  const user = response.data.user || (response.data as unknown as User);
  setStoredUser(user);
  return user;
}

export function getRoleDestination(role: UserRole): string {
  switch (role) {
    case 'customer':
      return '/customer/services';
    case 'provider':
      return '/provider';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
}

export { getStoredToken, getStoredUser, clearAuth };
