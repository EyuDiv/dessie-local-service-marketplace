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
