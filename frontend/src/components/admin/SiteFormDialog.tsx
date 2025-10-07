import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService, type Site, type CreateSiteDto, type UpdateSiteDto } from '@/services/admin.service';
import { useAuthStore } from '@/store/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  site: Site | null;
}

export default function SiteFormDialog({ isOpen, onClose, site }: Props) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({
    companyId: currentUser?.companyId || '',
    siteName: '',
    siteCode: '',
    siteType: '',
    address: '',
    city: '',
    state: '',
    country: '',
    managerName: '',
    managerEmail: '',
    managerPhone: '',
    isActive: true,
  });

  // Fetch companies (for SUPER_ADMIN)
  const { data: companiesResponse } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: adminService.getAllCompanies,
    enabled: currentUser?.role === 'SUPER_ADMIN' && isOpen,
  });

  const companies = companiesResponse?.data || [];

  useEffect(() => {
    if (site) {
      setFormData({
        companyId: site.companyId,
        siteName: site.siteName,
        siteCode: site.siteCode,
        siteType: site.siteType || '',
        address: site.address || '',
        city: site.city || '',
        state: site.state || '',
        country: site.country || '',
        managerName: site.managerName || '',
        managerEmail: site.managerEmail || '',
        managerPhone: site.managerPhone || '',
        isActive: site.isActive,
      });
    } else {
      setFormData({
        companyId: currentUser?.companyId || '',
        siteName: '',
        siteCode: '',
        siteType: '',
        address: '',
        city: '',
        state: '',
        country: '',
        managerName: '',
        managerEmail: '',
        managerPhone: '',
        isActive: true,
      });
    }
  }, [site, currentUser]);

  const createMutation = useMutation({
    mutationFn: (data: CreateSiteDto) => adminService.createSite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSiteDto }) =>
      adminService.updateSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (site) {
      // Update
      const updateData: UpdateSiteDto = {
        siteName: formData.siteName,
        siteCode: formData.siteCode,
        siteType: formData.siteType || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        managerName: formData.managerName || undefined,
        managerEmail: formData.managerEmail || undefined,
        managerPhone: formData.managerPhone || undefined,
        isActive: formData.isActive,
      };
      await updateMutation.mutateAsync({ id: site.id, data: updateData });
    } else {
      // Create
      const createData: CreateSiteDto = {
        companyId: formData.companyId,
        siteName: formData.siteName,
        siteCode: formData.siteCode,
        siteType: formData.siteType || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        managerName: formData.managerName || undefined,
        managerEmail: formData.managerEmail || undefined,
        managerPhone: formData.managerPhone || undefined,
      };
      await createMutation.mutateAsync(createData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {site ? 'Edit Site' : 'Add New Site'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company (SUPER_ADMIN only) */}
          {currentUser?.role === 'SUPER_ADMIN' && !site && (
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

          <div className="grid grid-cols-2 gap-4">
            {/* Site Name */}
            <div>
              <Label>Site Name *</Label>
              <Input
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                required
              />
            </div>

            {/* Site Code */}
            <div>
              <Label>Site Code *</Label>
              <Input
                type="text"
                value={formData.siteCode}
                onChange={(e) => setFormData({ ...formData, siteCode: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Site Type */}
          <div>
            <Label>Site Type</Label>
            <Input
              type="text"
              value={formData.siteType}
              onChange={(e) => setFormData({ ...formData, siteType: e.target.value })}
              placeholder="e.g., Manufacturing, Warehouse, Office"
            />
          </div>

          {/* Address */}
          <div>
            <Label>Address</Label>
            <Input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* City */}
            <div>
              <Label>City</Label>
              <Input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            {/* State */}
            <div>
              <Label>State</Label>
              <Input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>

            {/* Country */}
            <div>
              <Label>Country</Label>
              <Input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Site Manager Details</h3>

            <div className="space-y-4">
              {/* Manager Name */}
              <div>
                <Label>Manager Name</Label>
                <Input
                  type="text"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Manager Email */}
                <div>
                  <Label>Manager Email</Label>
                  <Input
                    type="email"
                    value={formData.managerEmail}
                    onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                  />
                </div>

                {/* Manager Phone */}
                <div>
                  <Label>Manager Phone</Label>
                  <Input
                    type="tel"
                    value={formData.managerPhone}
                    onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          {site && (
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
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : site
                ? 'Update Site'
                : 'Create Site'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
