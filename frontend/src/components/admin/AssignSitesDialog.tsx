import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminService, type User } from '@/services/admin.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function AssignSitesDialog({ isOpen, onClose, user }: Props) {
  const queryClient = useQueryClient();
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);

  // Fetch sites for the target user's company only
  // This ensures MANAGER/VIEWER users can only be assigned to sites from their own company
  const { data: sitesResponse } = useQuery({
    queryKey: ['admin-sites', user.companyId],
    queryFn: () => adminService.getSites(user.companyId),
    enabled: isOpen,
  });

  // Fetch user's assigned sites
  const { data: userSitesResponse } = useQuery({
    queryKey: ['user-sites', user.id],
    queryFn: () => adminService.getUserSites(user.id),
    enabled: isOpen,
  });

  const sites = sitesResponse?.data || [];
  const userSites = userSitesResponse?.data || [];

  useEffect(() => {
    if (userSites.length > 0) {
      setSelectedSiteIds(userSites.map((site: any) => site.id));
    }
  }, [userSites]);

  const assignMutation = useMutation({
    mutationFn: (siteIds: string[]) => adminService.assignSitesToUser(user.id, siteIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-sites', user.id] });
      onClose();
    },
  });

  const handleToggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSubmit = async () => {
    await assignMutation.mutateAsync(selectedSiteIds);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Assign Sites</h2>
            <p className="text-sm text-gray-500 mt-1">{user.fullName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {sites.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sites available</p>
          ) : (
            <div className="space-y-2">
              {sites.map((site: any) => (
                <label
                  key={site.id}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedSiteIds.includes(site.id)}
                    onChange={() => handleToggleSite(site.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{site.siteName}</div>
                    <div className="text-sm text-gray-500">{site.siteCode}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? 'Saving...' : 'Save Assignment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
