import api from './api';

export interface CorrectiveAction {
  id: string;
  companyId: string;
  siteId: string | null;
  title: string;
  description: string | null;
  linkedParameter: string | null;
  linkedMonth: string | null;
  linkedYear: number | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  dueDate: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  closureNotes: string | null;
  assignedToId: string | null;
  createdById: string | null;
  closedById: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { siteName: string; siteCode: string } | null;
  assignedTo?: { fullName: string; email: string } | null;
  createdBy?: { fullName: string; email: string } | null;
  closedBy?: { fullName: string; email: string } | null;
}

export interface CreateCapaDto {
  title: string;
  description?: string;
  siteId?: string;
  linkedParameter?: string;
  linkedMonth?: string;
  linkedYear?: number;
  priority?: string;
  dueDate?: string;
  rootCause?: string;
  correctiveAction?: string;
  assignedToId?: string;
}

export type UpdateCapaDto = Partial<CreateCapaDto> & {
  status?: string;
  closureNotes?: string;
};

export const capaService = {
  getCorrectiveActions: async (params?: {
    siteId?: string;
    status?: string;
    priority?: string;
    assignedToId?: string;
    overdue?: boolean;
  }) => {
    const response = await api.get('/capa', { params });
    return response.data;
  },

  getCorrectiveAction: async (id: string) => {
    const response = await api.get(`/capa/${id}`);
    return response.data;
  },

  createCorrectiveAction: async (data: CreateCapaDto) => {
    const response = await api.post('/capa', data);
    return response.data;
  },

  updateCorrectiveAction: async (id: string, data: UpdateCapaDto) => {
    const response = await api.put(`/capa/${id}`, data);
    return response.data;
  },

  deleteCorrectiveAction: async (id: string) => {
    const response = await api.delete(`/capa/${id}`);
    return response.data;
  },
};
