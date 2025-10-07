import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { downloadExcelTemplate, parseExcelFile, validateExcelData } from '@/lib/excelTemplate';
import { dashboardService } from '@/services/dashboard.service';
import { useQuery } from '@tanstack/react-query';

export default function ExcelImport() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Fetch sites
  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: dashboardService.getSites,
  });

  const sites = sitesData?.data || [];

  // Generate year options (current year + 4 previous years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(parseInt(selectedYear));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationErrors([]);
    setParsedData(null);
    setUploadResult(null);

    try {
      // Parse Excel file
      const data = await parseExcelFile(file);
      setParsedData(data);

      // Validate data
      const validation = validateExcelData(data);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
      }
    } catch (error: any) {
      setValidationErrors([`Failed to parse Excel file: ${error.message}`]);
    }
  };

  const handleUpload = async () => {
    if (!parsedData || !selectedSite || validationErrors.length > 0) {
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const response = await dashboardService.bulkImportMetrics({
        siteId: selectedSite,
        year: parseInt(selectedYear),
        metricsData: parsedData,
      });

      setUploadResult(response.data);

      // If successful, navigate to dashboard with the imported site/month/year after 2 seconds
      if (response.data.success > 0) {
        // Store the import context for dashboard to pick up
        localStorage.setItem('lastImport', JSON.stringify({
          siteId: selectedSite,
          year: parseInt(selectedYear),
          // Use the first month from the data as the default
          month: parsedData[0]?.month || 'January'
        }));

        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      setValidationErrors([`Upload failed: ${error.response?.data?.message || error.message}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = selectedFile && parsedData && selectedSite && validationErrors.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Excel Import</h1>
            <p className="text-gray-600 mt-1">Import safety metrics data from Excel file</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        {/* Step 1: Download Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Step 1: Download Template
            </CardTitle>
            <CardDescription>
              Download the Excel template with all 18 safety parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Select Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleDownloadTemplate} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <strong>Template Format:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>First column: Month (January to December)</li>
                <li>Remaining columns: Target and Actual values for each parameter</li>
                <li>Total 37 columns (1 Month + 18 parameters × 2)</li>
                <li>Fill in the data and save the file</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Select Site and Upload File */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Step 2: Select Site & Upload File
            </CardTitle>
            <CardDescription>
              Choose the site and upload the filled Excel file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Select Site *</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose site..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site: any) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.company ? `${site.siteName} (${site.company.companyName})` : site.siteName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Upload Excel File *</Label>
              <div className="mt-2 flex items-center gap-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-gray-400">
                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Validation Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                    <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Preview Data */}
        {parsedData && validationErrors.length === 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                Data Preview
              </CardTitle>
              <CardDescription className="text-green-600">
                {parsedData.length} months of data ready to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Month</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Man Days</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Safe Work Hours</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Safety Induction</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">...</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{row.month}</td>
                        <td className="px-4 py-2">{row.manDaysTarget}/{row.manDaysActual}</td>
                        <td className="px-4 py-2">{row.safeWorkHoursTarget}/{row.safeWorkHoursActual}</td>
                        <td className="px-4 py-2">{row.safetyInductionTarget}/{row.safetyInductionActual}</td>
                        <td className="px-4 py-2 text-gray-400">+15 more</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <Card className={uploadResult.failed === 0 ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Upload Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Success:</strong> {uploadResult.success} months imported
                </p>
                {uploadResult.failed > 0 && (
                  <>
                    <p className="text-sm text-red-600">
                      <strong>Failed:</strong> {uploadResult.failed} months
                    </p>
                    {uploadResult.errors?.length > 0 && (
                      <ul className="ml-4 space-y-1">
                        {uploadResult.errors.map((err: any, index: number) => (
                          <li key={index} className="text-sm text-red-600">
                            {err.month}: {err.error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {uploadResult.failed === 0 && (
                  <p className="text-sm text-green-600">
                    Redirecting to dashboard...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!canUpload || isUploading}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
