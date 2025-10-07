import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminService, type Site } from '@/services/admin.service';
import { useAuthStore } from '@/store/authStore';
import SiteFormDialog from './SiteFormDialog';

export default function SiteManagement() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user)!;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Fetch sites
  const { data: sitesResponse, isLoading } = useQuery({
    queryKey: ['admin-sites'],
    queryFn: () => adminService.getSites(),
  });

  const sites = sitesResponse?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sites'] });
    },
  });

  const handleEdit = (site: Site) => {
    setSelectedSite(site);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, siteName: string) => {
    if (confirm(`Are you sure you want to delete site "${siteName}"? This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleAddNew = () => {
    setSelectedSite(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedSite(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Site Management</CardTitle>
              <CardDescription>Manage sites for your company</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Site
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading sites...</div>
          ) : sites.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No sites found</p>
              <Button onClick={handleAddNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Site
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Site Name</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Code</th>
                    {user.role === 'SUPER_ADMIN' && (
                      <th className="text-left p-3 font-semibold text-sm text-gray-700">Company</th>
                    )}
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Type</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Location</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Manager</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Status</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site: Site) => (
                    <tr key={site.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{site.siteName}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm text-gray-600">{site.siteCode}</span>
                      </td>
                      {user.role === 'SUPER_ADMIN' && (
                        <td className="p-3">
                          <div className="text-sm text-gray-900">{site.company?.companyName || '-'}</div>
                        </td>
                      )}
                      <td className="p-3">
                        <span className="text-sm text-gray-600">{site.siteType || '-'}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600">
                          {[site.city, site.state, site.country]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          <div className="text-gray-900">{site.managerName || '-'}</div>
                          {site.managerEmail && (
                            <div className="text-gray-500 text-xs">{site.managerEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            site.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {site.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(site)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(site.id, site.siteName)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      <SiteFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        site={selectedSite}
      />
    </>
  );
}
