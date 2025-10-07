import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService, type User, type CreateUserDto, type UpdateUserDto } from '@/services/admin.service';
import { useAuthStore } from '@/store/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function UserFormDialog({ isOpen, onClose, user }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    companyId: currentUser?.companyId || '',
    email: '',
    password: '',
    fullName: '',
    role: 'VIEWER' as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER',
    accessLevel: 'ALL_SITES' as 'ALL_SITES' | 'SPECIFIC_SITES',
    isActive: true,
  });

  // Fetch companies (for SUPER_ADMIN)
  const { data: companiesResponse } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: adminService.getAllCompanies,
    enabled: currentUser?.role === 'SUPER_ADMIN',
  });

  const companies = companiesResponse?.data || [];

  useEffect(() => {
    if (user) {
      setFormData({
        companyId: currentUser?.companyId || '',
        email: user.email,
        password: '',
        fullName: user.fullName,
        role: user.role,
        accessLevel: user.accessLevel,
        isActive: user.isActive,
      });
    } else {
      setFormData({
        companyId: currentUser?.companyId || '',
        email: '',
        password: '',
        fullName: '',
        role: 'VIEWER',
        accessLevel: 'ALL_SITES',
        isActive: true,
      });
    }
  }, [user, currentUser]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserDto) => adminService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user) {
      // Update
      const updateData: UpdateUserDto = {
        fullName: formData.fullName,
        role: formData.role,
        accessLevel: formData.accessLevel,
        isActive: formData.isActive,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await updateMutation.mutateAsync({ id: user.id, data: updateData });
    } else {
      // Create
      const createData: CreateUserDto = {
        companyId: formData.companyId,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        accessLevel: formData.accessLevel,
      };
      await createMutation.mutateAsync(createData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company (SUPER_ADMIN only) */}
          {currentUser?.role === 'SUPER_ADMIN' && !user && (
            <div>
              <Label>Company *</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) =>
                  setFormData({ ...formData, companyId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company: any) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email */}
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!user}
              required
            />
          </div>

          {/* Password */}
          <div>
            <Label>Password {!user && '*'}</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              placeholder={user ? 'Leave blank to keep current' : ''}
            />
          </div>

          {/* Full Name */}
          <div>
            <Label>Full Name *</Label>
            <Input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          {/* Role */}
          <div>
            <Label>Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                )}
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Access Level */}
          <div>
            <Label>Access Level *</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value: any) =>
                setFormData({ ...formData, accessLevel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_SITES">All Sites</SelectItem>
                <SelectItem value="SPECIFIC_SITES">Specific Sites</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          {user && (
            <div>
              <Label>Status *</Label>
              <Select
                value={formData.isActive ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value === 'active' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : user
                ? 'Update User'
                : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
