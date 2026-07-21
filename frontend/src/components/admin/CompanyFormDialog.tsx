import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService, type Company, type CreateCompanyDto, type UpdateCompanyDto } from '@/services/admin.service';

const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB, matches the backend limit

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

export default function CompanyFormDialog({ isOpen, onClose, company }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    industry: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.companyName,
        companyCode: company.companyCode,
        industry: company.industry || '',
        address: company.address || '',
        contactEmail: company.contactEmail || '',
        contactPhone: company.contactPhone || '',
        logoUrl: company.logoUrl || '',
        isActive: company.isActive,
      });
    } else {
      setFormData({
        companyName: '',
        companyCode: '',
        industry: '',
        address: '',
        contactEmail: '',
        contactPhone: '',
        logoUrl: '',
        isActive: true,
      });
    }
  }, [company]);

  const createMutation = useMutation({
    mutationFn: (data: CreateCompanyDto) => adminService.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      onClose();
    },
  });

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setLogoError('');

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Logo must be a PNG, JPEG, WEBP, or SVG image');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be smaller than 2MB');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await adminService.uploadLogo(file);
      setFormData((prev) => ({ ...prev, logoUrl: result.data.url }));
    } catch (err: any) {
      setLogoError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompanyDto }) =>
      adminService.updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (company) {
      // Update
      const updateData: UpdateCompanyDto = {
        companyName: formData.companyName,
        companyCode: formData.companyCode,
        industry: formData.industry || undefined,
        address: formData.address || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        logoUrl: formData.logoUrl || undefined,
        isActive: formData.isActive,
      };
      await updateMutation.mutateAsync({ id: company.id, data: updateData });
    } else {
      // Create
      const createData: CreateCompanyDto = {
        companyName: formData.companyName,
        companyCode: formData.companyCode,
        industry: formData.industry || undefined,
        address: formData.address || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        logoUrl: formData.logoUrl || undefined,
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
            {company ? 'Edit Company' : 'Add New Company'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <Label>Company Name *</Label>
              <Input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
              />
            </div>

            {/* Company Code */}
            <div>
              <Label>Company Code *</Label>
              <Input
                type="text"
                value={formData.companyCode}
                onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Industry */}
          <div>
            <Label>Industry</Label>
            <Input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Manufacturing, Construction, Oil & Gas"
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

          <div className="grid grid-cols-2 gap-4">
            {/* Contact Email */}
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <Label>Contact Phone</Label>
              <Input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="h-12 w-12 rounded border object-contain bg-white"
                />
              ) : (
                <div className="h-12 w-12 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                  None
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_LOGO_TYPES.join(',')}
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingLogo}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {formData.logoUrl ? 'Replace' : 'Upload'} Logo
                  </>
                )}
              </Button>

              {formData.logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setFormData({ ...formData, logoUrl: '' })}
                >
                  Remove
                </Button>
              )}
            </div>
            {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
            <p className="text-xs text-muted-foreground mt-1">PNG, JPEG, WEBP, or SVG — max 2MB.</p>
          </div>

          {/* Status */}
          {company && (
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
                : company
                ? 'Update Company'
                : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
