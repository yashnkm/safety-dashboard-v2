import { Card, CardContent } from '@/components/ui/card.tsx';
import { Select } from '@/components/ui/select.tsx';
import { Calendar, MapPin } from 'lucide-react';

interface Site {
  id: string;
  siteName: string;
}

interface FiltersProps {
  sites?: Site[];
  selectedSite: string;
  selectedMonth: string;
  selectedYear: number;
  onSiteChange: (siteId: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: number) => void;
  loading?: boolean;
}

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function Filters({
  sites = [],
  selectedSite,
  selectedMonth,
  selectedYear,
  onSiteChange,
  onMonthChange,
  onYearChange,
  loading,
}: FiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Site Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Site
            </label>
            <Select
              value={selectedSite}
              onChange={(e) => onSiteChange(e.target.value)}
              disabled={loading}
            >
              <option value="all">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteName}
                </option>
              ))}
            </Select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Month
            </label>
            <Select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              disabled={loading}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Year
            </label>
            <Select
              value={selectedYear.toString()}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              disabled={loading}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
