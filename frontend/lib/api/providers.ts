import { apiClient } from './client';

export interface ProviderService {
  id: number;
  name: string;
  description?: string;
}

export interface ProviderUser {
  id: number;
  name: string;
  phone?: string;
}

export interface Provider {
  id: number;
  user_id: number;
  business_name: string;
  description: string | null;
  experience_years: number;
  location: string;
  availability_status: 'available' | 'busy' | 'offline';
  verification_status: 'verified';
  phone?: string;
  user?: ProviderUser;
  services: ProviderService[];
}

export interface ProvidersResponse {
  data: Provider[];
}

export interface ProviderFilterParams {
  service_id?: number | string;
  location?: string;
  availability_status?: string;
  search?: string;
}

export const getProviders = async (params?: ProviderFilterParams): Promise<Provider[]> => {
  const queryParams: Record<string, string | number> = {};
  if (params?.service_id) queryParams.service_id = params.service_id;
  if (params?.location && params.location !== 'all') queryParams.location = params.location;
  if (params?.availability_status && params.availability_status !== 'all') {
    queryParams.availability_status = params.availability_status;
  }
  if (params?.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }

  const response = await apiClient.get<ProvidersResponse>('/providers', {
    params: queryParams,
  });
  return response.data.data;
};

export interface ReviewCustomer {
  id: number;
  name: string;
}

export interface Review {
  id: number;
  customer_id: number;
  provider_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  customer?: ReviewCustomer;
}

export interface ReviewsResponse {
  data: Review[];
}

export const getProviderReviews = async (providerId: number | string): Promise<Review[]> => {
  const response = await apiClient.get<ReviewsResponse>(`/providers/${providerId}/reviews`);
  return response.data.data;
};

export interface AdminProviderItem {
  id: number;
  user_id: number;
  business_name: string;
  description: string | null;
  experience_years: number;
  location: string;
  availability_status: 'available' | 'busy' | 'offline';
  verification_status: 'verified' | 'pending' | 'rejected';
  cv_original_name: string | null;
  certificate_original_name: string | null;
  has_cv?: boolean;
  has_certificate?: boolean;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  services: ProviderService[];
}

export const getAdminProviders = async (): Promise<AdminProviderItem[]> => {
  const response = await apiClient.get<{ data: AdminProviderItem[] }>('/admin/providers');
  return response.data.data;
};

export const updateProviderVerification = async (
  id: number | string,
  verification_status: 'verified' | 'rejected' | 'pending',
  rejection_reason?: string | null
): Promise<{ message: string; provider: AdminProviderItem }> => {
  const response = await apiClient.put(`/admin/providers/${id}/verification`, {
    verification_status,
    rejection_reason: rejection_reason || null,
  });
  return response.data;
};

export const getAdminProviderCvBlob = async (id: number | string): Promise<Blob> => {
  const response = await apiClient.get(`/admin/providers/${id}/cv`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getAdminProviderCertBlob = async (id: number | string): Promise<Blob> => {
  const response = await apiClient.get(`/admin/providers/${id}/certificate`, {
    responseType: 'blob',
  });
  return response.data;
};

