import { apiClient } from './client';

export interface ProviderService {
  id: number;
  name: string;
  description?: string;
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
  services: ProviderService[];
}

export interface ProvidersResponse {
  data: Provider[];
}

export interface ProviderFilterParams {
  service_id?: number | string;
  location?: string;
  availability_status?: string;
}

export const getProviders = async (params?: ProviderFilterParams): Promise<Provider[]> => {
  const queryParams: Record<string, string | number> = {};
  if (params?.service_id) queryParams.service_id = params.service_id;
  if (params?.location && params.location !== 'all') queryParams.location = params.location;
  if (params?.availability_status && params.availability_status !== 'all') {
    queryParams.availability_status = params.availability_status;
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

