import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { capaService, type CorrectiveAction } from '@/services/capa.service';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/authStore';
import CapaFormDialog from '@/components/capa/CapaFormDialog';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW: 'bg-gray-100 text-gray-700 border-gray-300',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
  CLOSED: 'bg-green-100 text-green-800 border-green-300',
};

function isOverdue(capa: CorrectiveAction): boolean {
  return !!capa.dueDate && capa.status !== 'CLOSED' && new Date(capa.dueDate) < new Date();
}

export default function CapaTracking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCapa, setSelectedCapa] = useState<CorrectiveAction | null>(null);

  const { data: sitesResponse } = useQuery({
    queryKey: ['capa-sites'],
    queryFn: dashboardService.getSites,
  });
  const sites = sitesResponse?.data || [];

  const { data: capaResponse, isLoading } = useQuery({
    queryKey: ['corrective-actions', statusFilter, siteFilter],
    queryFn: () =>
      capaService.getCorrectiveActions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        siteId: siteFilter === 'all' ? undefined : siteFilter,
      }),
  });
  const actions: CorrectiveAction[] = capaResponse?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => capaService.deleteCorrectiveAction(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corrective-actions'] }),
  });

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const handleCreate = () => {
    setSelectedCapa(null);
    setIsFormOpen(true);
  };

  const handleEdit = (capa: CorrectiveAction) => {
    setSelectedCapa(capa);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete corrective action "${title}"? This cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const openCount = actions.filter((a) => a.status !== 'CLOSED').length;
  const overdueCount = actions.filter(isOverdue).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CAPA Tracking</h1>
            <p className="text-gray-600 mt-1">Corrective and preventive actions</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                New Corrective Action
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ClipboardList className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{openCount}</p>
                <p className="text-sm text-gray-500">Open / In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-gray-500">Overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{actions.filter((a) => a.status === 'CLOSED').length}</p>
                <p className="text-sm text-gray-500">Closed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Corrective Actions</CardTitle>
              <div className="flex gap-2">
                <Select value={siteFilter} onValueChange={setSiteFilter}>
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Site" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites.map((site: any) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.siteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading corrective actions...</div>
            ) : actions.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No corrective actions match these filters</p>
                {canEdit && (
                  <Button onClick={handleCreate} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create the first one
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Title</th>
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Site</th>
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Assigned To</th>
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Priority</th>
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Status</th>
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Due Date</th>
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((capa) => (
                      <tr key={capa.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{capa.title}</div>
                          {capa.linkedParameter && (
                            <div className="text-xs text-gray-500">
                              {capa.linkedParameter}
                              {capa.linkedMonth && ` — ${capa.linkedMonth} ${capa.linkedYear || ''}`}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600">{capa.site?.siteName || '—'}</td>
                        <td className="p-3 text-sm text-gray-600">
                          {capa.assignedTo?.fullName || <span className="text-gray-400">Unassigned</span>}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={PRIORITY_COLORS[capa.priority]}>
                            {capa.priority}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={STATUS_COLORS[capa.status]}>
                            {capa.status.replace('_', ' ')}
                          </Badge>
                          {isOverdue(capa) && (
                            <Badge variant="outline" className="ml-1 bg-red-100 text-red-800 border-red-300">
                              Overdue
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {capa.dueDate ? new Date(capa.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(capa)}>
                              {canEdit ? 'Edit' : 'View'}
                            </Button>
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(capa.id, capa.title)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CapaFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCapa(null);
        }}
        capa={selectedCapa}
        sites={sites}
        readOnly={!canEdit}
      />
    </div>
  );
}
