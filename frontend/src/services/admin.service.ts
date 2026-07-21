import { api } from './api';

// ==================== COMPANIES ====================

export type Company = {
  id: string;
  companyName: string;
  companyCode: string;
  industry?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sites: number;
    users: number;
  };
};

export type CreateCompanyDto = {
  companyName: string;
  companyCode: string;
  industry?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
};

export type UpdateCompanyDto = Partial<CreateCompanyDto> & {
  isActive?: boolean;
};

// ==================== SITES ====================

export type Site = {
  id: string;
  companyId: string;
  siteName: string;
  siteCode: string;
  siteType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: {
    companyName: string;
    companyCode: string;
  };
  _count?: {
    userSiteAccess: number;
    safetyMetrics: number;
  };
};

export type CreateSiteDto = {
  companyId: string;
  siteName: string;
  siteCode: string;
  siteType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
};

export type UpdateSiteDto = Partial<Omit<CreateSiteDto, 'companyId'>> & {
  isActive?: boolean;
};

// ==================== USERS ====================

export type User = {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
  accessLevel: 'ALL_SITES' | 'SPECIFIC_SITES';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  company?: {
    companyName: string;
    companyCode: string;
  };
  userSiteAccess?: {
    site: {
      id: string;
      siteName: string;
      siteCode: string;
    };
  }[];
};

export type CreateUserDto = {
  companyId: string;
  email: string;
  password: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
  accessLevel: 'ALL_SITES' | 'SPECIFIC_SITES';
};

export type UpdateUserDto = Partial<Omit<CreateUserDto, 'companyId' | 'email'>> & {
  isActive?: boolean;
};

// ==================== ADMIN SERVICE ====================

export const adminService = {
  // Uploads
  uploadLogo: async (file: File): Promise<{ status: string; data: { url: string } }> => {
    const formData = new FormData();
    formData.append('logo', file);
    // Let the browser set Content-Type (with the multipart boundary) itself —
    // the api client's default 'application/json' header would otherwise
    // override it and the server couldn't parse the body.
    const response = await api.post('/admin/upload-logo', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  // Companies
  getAllCompanies: async () => {
    const response = await api.get('/admin/companies');
    return response.data;
  },

  createCompany: async (data: CreateCompanyDto) => {
    const response = await api.post('/admin/companies', data);
    return response.data;
  },

  updateCompany: async (id: string, data: UpdateCompanyDto) => {
    const response = await api.put(`/admin/companies/${id}`, data);
    return response.data;
  },

  deleteCompany: async (id: string) => {
    const response = await api.delete(`/admin/companies/${id}`);
    return response.data;
  },

  // Sites
  getSites: async (companyId?: string) => {
    const params = companyId ? { companyId } : {};
    const response = await api.get('/admin/sites', { params });
    return response.data;
  },

  createSite: async (data: CreateSiteDto) => {
    const response = await api.post('/admin/sites', data);
    return response.data;
  },

  updateSite: async (id: string, data: UpdateSiteDto) => {
    const response = await api.put(`/admin/sites/${id}`, data);
    return response.data;
  },

  deleteSite: async (id: string) => {
    const response = await api.delete(`/admin/sites/${id}`);
    return response.data;
  },

  // Users
  getUsers: async (companyId?: string) => {
    const params = companyId ? { companyId } : {};
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createUser: async (data: CreateUserDto) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: UpdateUserDto) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  assignSitesToUser: async (userId: string, siteIds: string[]) => {
    const response = await api.post(`/admin/users/${userId}/sites`, { siteIds });
    return response.data;
  },

  getUserSites: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}/sites`);
    return response.data;
  },
};
