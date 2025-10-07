import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminService, type Company } from '@/services/admin.service';
import CompanyFormDialog from './CompanyFormDialog';

export default function CompanyManagement() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Fetch companies
  const { data: companiesResponse, isLoading } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: adminService.getAllCompanies,
  });

  const companies = companiesResponse?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
  });

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, companyName: string) => {
    if (confirm(`Are you sure you want to delete company "${companyName}"? This will also delete all associated sites and users. This action cannot be undone.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleAddNew = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCompany(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Company Management</CardTitle>
              <CardDescription>Manage companies (SUPER_ADMIN only)</CardDescription>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No companies found</p>
              <Button onClick={handleAddNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Company
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Company Name</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Code</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Industry</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Contact</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Sites</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Users</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Status</th>
                    <th className="text-left p-3 font-semibold text-sm text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company: Company) => (
                    <tr key={company.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{company.companyName}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm text-gray-600">{company.companyCode}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">{company.industry || '-'}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {company.contactEmail && (
                            <div className="text-gray-900">{company.contactEmail}</div>
                          )}
                          {company.contactPhone && (
                            <div className="text-gray-500">{company.contactPhone}</div>
                          )}
                          {!company.contactEmail && !company.contactPhone && '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {company._count?.sites || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600">
                          {company._count?.users || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            company.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(company)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(company.id, company.companyName)}
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

      <CompanyFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        company={selectedCompany}
      />
    </>
  );
}
