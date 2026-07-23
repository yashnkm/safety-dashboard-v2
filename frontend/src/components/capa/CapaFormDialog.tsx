import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { capaService, type CorrectiveAction } from '@/services/capa.service';
import { adminService } from '@/services/admin.service';
import { useAuthStore } from '@/store/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  capa: CorrectiveAction | null;
  sites: any[];
  readOnly: boolean;
}

const textareaClass =
  'flex w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

const emptyForm = {
  title: '',
  description: '',
  siteId: '',
  priority: 'MEDIUM',
  status: 'OPEN',
  dueDate: '',
  rootCause: '',
  correctiveAction: '',
  closureNotes: '',
  assignedToId: '',
};

export default function CapaFormDialog({ isOpen, onClose, capa, sites, readOnly }: Props) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');

  // Only SUPER_ADMIN/ADMIN can list users for the assignee dropdown - the
  // admin API that provides it is restricted to those roles. MANAGER can
  // still create/edit corrective actions, just without reassigning them.
  const canListUsers = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const { data: usersResponse } = useQuery({
    queryKey: ['capa-assignable-users'],
    queryFn: () => adminService.getUsers(),
    enabled: isOpen && canListUsers,
  });
  const users = usersResponse?.data || [];

  useEffect(() => {
    if (capa) {
      setFormData({
        title: capa.title,
        description: capa.description || '',
        siteId: capa.siteId || '',
        priority: capa.priority,
        status: capa.status,
        dueDate: capa.dueDate ? capa.dueDate.slice(0, 10) : '',
        rootCause: capa.rootCause || '',
        correctiveAction: capa.correctiveAction || '',
        closureNotes: capa.closureNotes || '',
        assignedToId: capa.assignedToId || '',
      });
    } else {
      setFormData(emptyForm);
    }
    setError('');
  }, [capa, isOpen]);

  const createMutation = useMutation({
    mutationFn: () =>
      capaService.createCorrectiveAction({
        title: formData.title,
        description: formData.description || undefined,
        siteId: formData.siteId || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        rootCause: formData.rootCause || undefined,
        correctiveAction: formData.correctiveAction || undefined,
        assignedToId: formData.assignedToId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to create corrective action'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      capaService.updateCorrectiveAction(capa!.id, {
        title: formData.title,
        description: formData.description || undefined,
        siteId: formData.siteId || undefined,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
        rootCause: formData.rootCause || undefined,
        correctiveAction: formData.correctiveAction || undefined,
        closureNotes: formData.closureNotes || undefined,
        assignedToId: formData.assignedToId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.message || 'Failed to update corrective action'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (capa) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">
            {capa ? (readOnly ? 'View Corrective Action' : 'Edit Corrective Action') : 'New Corrective Action'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={readOnly}
            />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              className={textareaClass}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={readOnly}
            />
          </div>

          {capa?.linkedParameter && (
            <p className="text-xs text-gray-500">
              Linked to: {capa.linkedParameter}
              {capa.linkedMonth && ` — ${capa.linkedMonth} ${capa.linkedYear || ''}`}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Site</Label>
              <Select
                value={formData.siteId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, siteId: v === 'none' ? '' : v })}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="No specific site" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                  <SelectItem value="none">No specific site</SelectItem>
                  {sites.map((site: any) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.siteName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                key={`priority-${capa?.id || 'new'}`}
                value={formData.priority}
                // Radix can fire a spurious onValueChange("") when multiple
                // Selects mount/unmount together in the same form (this one
                // sits next to the conditionally-rendered Status select) -
                // "" is never a real priority, so ignore it defensively.
                onValueChange={(v) => v && setFormData((prev) => ({ ...prev, priority: v }))}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                disabled={readOnly}
              />
            </div>

            {capa && (
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                  disabled={readOnly}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {canListUsers ? (
            <div>
              <Label>Assigned To</Label>
              <Select
                value={formData.assignedToId || 'unassigned'}
                onValueChange={(v) => setFormData({ ...formData, assignedToId: v === 'unassigned' ? '' : v })}
                disabled={readOnly}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            capa?.assignedTo && (
              <p className="text-sm text-gray-600">
                Assigned to: <span className="font-medium">{capa.assignedTo.fullName}</span>
              </p>
            )
          )}

          <div>
            <Label>Root Cause</Label>
            <textarea
              className={textareaClass}
              value={formData.rootCause}
              onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
              disabled={readOnly}
            />
          </div>

          <div>
            <Label>Corrective Action Plan</Label>
            <textarea
              className={textareaClass}
              value={formData.correctiveAction}
              onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
              disabled={readOnly}
            />
          </div>

          {(capa?.status === 'CLOSED' || formData.status === 'CLOSED') && (
            <div>
              <Label>Closure Notes</Label>
              <textarea
                className={textareaClass}
                value={formData.closureNotes}
                onChange={(e) => setFormData({ ...formData, closureNotes: e.target.value })}
                disabled={readOnly}
              />
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
          )}

          {!readOnly && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : capa ? (
                  'Save Changes'
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
