import { apiClient } from './client';

export interface CreateServiceRequestPayload {
  provider_id: number;
  service_id: number;
  description: string;
  location: string;
  requested_date: string;
  requested_time: string;
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
}

export interface CreateServiceRequestResponse {
  message: string;
  data: ServiceRequestItem;
}

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
  const response = await apiClient.get<{ data: ServiceRequestItem[] }>('/requests');
  return response.data.data;
};

export const getProviderRequests = async (): Promise<ServiceRequestItem[]> => {
  const response = await apiClient.get<{ data: ServiceRequestItem[] }>('/provider/requests');
  return response.data.data;
};

export const acceptProviderRequest = async (id: number | string): Promise<any> => {
  const response = await apiClient.put(`/provider/requests/${id}/accept`);
  return response.data;
};

export const rejectProviderRequest = async (id: number | string): Promise<any> => {
  const response = await apiClient.put(`/provider/requests/${id}/reject`);
  return response.data;
};

export const startProviderRequest = async (id: number | string): Promise<any> => {
  const response = await apiClient.put(`/provider/requests/${id}/start`);
  return response.data;
};

export const completeProviderRequest = async (id: number | string): Promise<any> => {
  const response = await apiClient.put(`/provider/requests/${id}/complete`);
  return response.data;
};

export const updateProviderAvailability = async (
  availability_status: 'available' | 'busy' | 'offline'
): Promise<any> => {
  const response = await apiClient.put('/provider/availability', { availability_status });
  return response.data;
};
