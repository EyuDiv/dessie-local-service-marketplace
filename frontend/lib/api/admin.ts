import { apiClient } from './client';

export interface AdminRecentRequest {
  id: number;
  customer_id: number;
  provider_id: number;
  service_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  requested_date: string;
  created_at: string;
  customer?: {
    id: number;
    name: string;
    email: string;
  };
  provider?: {
    id: number;
    business_name: string;
    location: string;
  };
  service?: {
    id: number;
    name: string;
  };
}

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'provider' | 'admin';
  status: 'active' | 'suspended';
  total_requests_count: number;
  last_login_at?: string | null;
  created_at: string;
}

export interface AdminDashboardStats {
  total_providers: number;
  pending_providers: number;
  verified_providers: number;
  rejected_providers: number;
  total_users: number;
  suspended_users_count: number;
  active_users_today: number;
  total_requests: number;
  requests_today: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  pending_complaints_count: number;
  resolved_complaints_count: number;
  total_complaints_count: number;
  recent_requests: AdminRecentRequest[];
  recent_users: AdminUserItem[];
}

export interface PaginatedAdminUsers {
  data: AdminUserItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminUsersFilterParams {
  search?: string;
  status?: 'all' | 'active' | 'suspended';
  page?: number;
  per_page?: number;
}

export type ComplaintStatus = 'pending' | 'resolved' | 'dismissed';

export interface AdminComplaintItem {
  id: number;
  user_id: number;
  provider_id: number | null;
  subject: string;
  message: string;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  provider?: {
    id: number;
    business_name: string;
    location: string;
  } | null;
}

export interface AdminComplaintsFilterParams {
  status?: 'all' | ComplaintStatus;
  search?: string;
}

/**
 * Fetch platform-wide analytics and KPI metrics for the Admin Portal.
 * GET /api/admin/dashboard-stats
 */
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const response = await apiClient.get<{ data: AdminDashboardStats }>('/admin/dashboard-stats');
  return response.data.data;
};

/**
 * Fetch paginated customer/client accounts with search and status filters.
 * GET /api/admin/users
 */
export const getAdminUsers = async (
  params?: AdminUsersFilterParams
): Promise<PaginatedAdminUsers> => {
  const queryParams: Record<string, string | number> = {};
  if (params?.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params?.status && params.status !== 'all') {
    queryParams.status = params.status;
  }
  if (params?.page) {
    queryParams.page = params.page;
  }
  if (params?.per_page) {
    queryParams.per_page = params.per_page;
  }

  const response = await apiClient.get<PaginatedAdminUsers>('/admin/users', {
    params: queryParams,
  });
  return response.data;
};

/**
 * Activate or suspend a regular user account.
 * PATCH /api/admin/users/{id}/status
 */
export const updateAdminUserStatus = async (
  id: number | string,
  status?: 'active' | 'suspended'
): Promise<{ message: string; data: AdminUserItem }> => {
  const response = await apiClient.patch<{ message: string; data: AdminUserItem }>(
    `/admin/users/${id}/status`,
    status ? { status } : {}
  );
  return response.data;
};

/**
 * Fetch user complaints and support disputes.
 * GET /api/admin/complaints
 */
export const getAdminComplaints = async (
  params?: AdminComplaintsFilterParams
): Promise<AdminComplaintItem[]> => {
  const queryParams: Record<string, string> = {};
  if (params?.status && params.status !== 'all') {
    queryParams.status = params.status;
  }
  if (params?.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }

  const response = await apiClient.get<{ data: AdminComplaintItem[] }>('/admin/complaints', {
    params: queryParams,
  });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

/**
 * Update a complaint status (pending, resolved, or dismissed).
 * PATCH /api/admin/complaints/{id}
 */
export const updateAdminComplaintStatus = async (
  id: number | string,
  status: ComplaintStatus
): Promise<{ message: string; data: AdminComplaintItem }> => {
  const response = await apiClient.patch<{ message: string; data: AdminComplaintItem }>(
    `/admin/complaints/${id}`,
    { status }
  );
  return response.data;
};

