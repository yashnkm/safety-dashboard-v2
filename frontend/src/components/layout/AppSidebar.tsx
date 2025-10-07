import {
  Shield,
  Building2,
  Calendar,
  CheckSquare,
  Square,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Settings,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore.ts';
import { authService } from '@/services/auth.service.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Separator } from '@/components/ui/separator.tsx';

interface Site {
  id: string;
  siteName: string;
  company?: {
    companyName: string;
  };
}

interface AppSidebarProps {
  sites?: Site[];
  selectedSite: string;
  selectedMonth: string;
  selectedYear: number;
  onSiteChange: (siteId: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  enabledCategories: Record<string, boolean>;
  onCategoryToggle: (category: string) => void;
  loading?: boolean;
}

const months = [
  { value: 'January', label: 'January' },
  { value: 'February', label: 'February' },
  { value: 'March', label: 'March' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
  { value: 'July', label: 'July' },
  { value: 'August', label: 'August' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const categories = [
  { id: 'operational', label: 'Operational', count: 2 },
  { id: 'training', label: 'Training', count: 3 },
  { id: 'compliance', label: 'Compliance', count: 4 },
  { id: 'documentation', label: 'Documentation', count: 2 },
  { id: 'emergency', label: 'Emergency & Audit', count: 2 },
  { id: 'incidents', label: 'Incidents', count: 4 },
];

export default function AppSidebar({
  sites = [],
  selectedSite,
  selectedMonth,
  selectedYear,
  onSiteChange,
  onMonthChange,
  onYearChange,
  enabledCategories,
  onCategoryToggle,
  loading,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    logout();
    navigate('/login');
  };

  const allEnabled = categories.every((cat) => enabledCategories[cat.id]);
  const noneEnabled = categories.every((cat) => !enabledCategories[cat.id]);

  const handleSelectAll = () => {
    categories.forEach((cat) => {
      if (!enabledCategories[cat.id]) {
        onCategoryToggle(cat.id);
      }
    });
  };

  const handleDeselectAll = () => {
    categories.forEach((cat) => {
      if (enabledCategories[cat.id]) {
        onCategoryToggle(cat.id);
      }
    });
  };

  return (
    <div className={`relative flex h-screen flex-col border-r bg-background transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-72'}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-white shadow-lg hover:bg-gray-100 transition-colors"
        style={{ backgroundColor: '#ffffff' }}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-700" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-700" />
        )}
      </button>

      {/* Sidebar Header */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <Shield className={`h-6 w-6 text-primary flex-shrink-0 ${isCollapsed ? '' : ''}`} />
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Safety Dashboard</span>
            <span className="text-xs text-muted-foreground">HSE Monitoring</span>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* User Info */}
        {!isCollapsed ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Navigation */}
            <div className="space-y-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                <button
                  onClick={() => navigate('/import')}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Data</span>
                </button>
              )}
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Admin Panel</span>
                </button>
              )}
            </div>

            <Separator />

        {/* Filters Section */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Building2 className="h-3 w-3" />
              Site
            </label>
            <Select value={selectedSite} onValueChange={onSiteChange} disabled={loading}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.company ? `${site.siteName} (${site.company.companyName})` : site.siteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Month
            </label>
            <Select value={selectedMonth} onValueChange={onMonthChange} disabled={loading}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Year
            </label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => onYearChange(parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Category Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Visible Categories</label>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryToggle(category.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                {enabledCategories[category.id] ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 text-left">{category.label}</span>
                <span className="text-xs text-muted-foreground">({category.count})</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleSelectAll}
              disabled={allEnabled}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleDeselectAll}
              disabled={noneEnabled}
            >
              Deselect All
            </Button>
          </div>
        </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className={`w-full text-destructive hover:text-destructive hover:bg-destructive/10 ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
          onClick={handleLogout}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && 'Logout'}
        </Button>
      </div>
    </div>
  );
}
