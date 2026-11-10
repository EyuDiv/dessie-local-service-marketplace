import { apiClient } from './client';

export interface CreateServiceRequestPayload {
  provider_id: number;
  service_id: number;
  description: string;
  location: string;
  requested_date: string;
  requested_time: string;
}

export interface ServiceRequestReview {
  id: number;
  request_id: number;
  rating: number;
  comment: string | null;
  created_at?: string;
}

export interface ServiceRequestItem {
  id: number;
  customer_id: number;
  provider_id: number;
  service_id: number;
  description: string;
  location: string;
  requested_date: string;
  requested_time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  provider?: {
    id: number;
    business_name: string;
    location: string;
    availability_status?: string;
    phone?: string | null;
  };
  customer?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  service?: {
    id: number;
    name: string;
  };
  review?: ServiceRequestReview | null;
}

export interface CreateServiceRequestResponse {
  message: string;
  data: ServiceRequestItem;
}

export interface CreateReviewPayload {
  request_id: number;
  rating: number;
  comment?: string;
}

type WrappedListResponse<T> =
  | T[]
  | { data?: T[] | { data?: T[] } };

const unwrapListResponse = <T>(payload: WrappedListResponse<T>): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.data)) {
      return payload.data.data;
    }
  }
  return [];
};

/**
 * Submit a new service request (Customer only).
 * POST /api/requests
 */
export const createServiceRequest = async (
  payload: CreateServiceRequestPayload
): Promise<CreateServiceRequestResponse> => {
  const response = await apiClient.post<CreateServiceRequestResponse>(
    '/requests',
    payload
  );
  return response.data;
};

export const getCustomerRequests = async (): Promise<ServiceRequestItem[]> => {
  const response = await apiClient.get<WrappedListResponse<ServiceRequestItem>>('/requests');
  return unwrapListResponse(response.data);
};

export const cancelCustomerRequest = async (
  id: number | string
): Promise<{ message: string; data: ServiceRequestItem }> => {
  const response = await apiClient.put<{ message: string; data: ServiceRequestItem }>(
    `/requests/${id}/cancel`
  );
  return response.data;
};

export const submitRequestReview = async (
  payload: CreateReviewPayload
): Promise<{ message: string; data: ServiceRequestReview }> => {
  const response = await apiClient.post<{ message: string; data: ServiceRequestReview }>(
    '/reviews',
    payload
  );
  return response.data;
};

export const getProviderRequests = async (): Promise<ServiceRequestItem[]> => {
  const response = await apiClient.get<WrappedListResponse<ServiceRequestItem>>('/provider/requests');
  return unwrapListResponse(response.data);
};

export interface RequestMutationResponse {
  message: string;
  data?: ServiceRequestItem;
}

export const acceptProviderRequest = async (id: number | string): Promise<RequestMutationResponse> => {
  const response = await apiClient.put<RequestMutationResponse>(`/provider/requests/${id}/accept`);
  return response.data;
};

export const rejectProviderRequest = async (id: number | string): Promise<RequestMutationResponse> => {
  const response = await apiClient.put<RequestMutationResponse>(`/provider/requests/${id}/reject`);
  return response.data;
};

export const startProviderRequest = async (id: number | string): Promise<RequestMutationResponse> => {
  const response = await apiClient.put<RequestMutationResponse>(`/provider/requests/${id}/start`);
  return response.data;
};

export const completeProviderRequest = async (id: number | string): Promise<RequestMutationResponse> => {
  const response = await apiClient.put<RequestMutationResponse>(`/provider/requests/${id}/complete`);
  return response.data;
};

export const updateProviderAvailability = async (
  availability_status: 'available' | 'busy' | 'offline'
): Promise<{ message: string; data?: unknown }> => {
  const response = await apiClient.put<{ message: string; data?: unknown }>('/provider/availability', {
    availability_status,
  });
  return response.data;
};
