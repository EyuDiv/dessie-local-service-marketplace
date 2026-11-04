import { apiClient } from './client';

export interface Service {
  id: number;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServicesResponse {
  data: Service[];
}

export interface ServiceResponse {
  data: Service;
}

export const getServices = async (): Promise<Service[]> => {
  const response = await apiClient.get<ServicesResponse>('/services');
  return response.data.data;
};

export const getService = async (id: number | string): Promise<Service> => {
  const response = await apiClient.get<ServiceResponse>(`/services/${id}`);
  return response.data.data;
};

export const getProviderServices = async (): Promise<Service[]> => {
  const response = await apiClient.get<ServicesResponse>('/provider/services');
  return response.data.data;
};

export const addProviderService = async (service_id: number | string): Promise<any> => {
  const response = await apiClient.post('/provider/services', { service_id });
  return response.data;
};

export const removeProviderService = async (service_id: number | string): Promise<any> => {
  const response = await apiClient.delete(`/provider/services/${service_id}`);
  return response.data;
};
