import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService } from '@/services/admin.service';

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  import_create: 'Imported (new)',
  import_update: 'Imported (updated)',
  login: 'Logged in',
};

function DiffSummary({ oldValues, newValues }: { oldValues: any; newValues: any }) {
  if (!newValues) return <span className="text-gray-400">—</span>;

  const keys = Array.from(
    new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])
  );
  const changed = keys.filter((k) => (oldValues?.[k] ?? null) !== (newValues?.[k] ?? null));

  if (changed.length === 0) {
    return <span className="text-gray-400">No field changes</span>;
  }

  return (
    <div className="space-y-1 text-xs">
      {changed.map((key) => (
        <div key={key} className="font-mono">
          <span className="text-gray-500">{key}:</span>{' '}
          <span className="text-red-500 line-through">{String(oldValues?.[key] ?? '—')}</span>{' '}
          <span className="text-gray-400">→</span>{' '}
          <span className="text-green-600">{String(newValues?.[key] ?? '—')}</span>
        </div>
      ))}
    </div>
  );
}

export default function AuditLogViewer() {
  const [entityType, setEntityType] = useState<string>('all');
  const [action, setAction] = useState<string>('all');
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, action, offset],
    queryFn: () =>
      adminService.getAuditLogs({
        entityType: entityType === 'all' ? undefined : entityType,
        action: action === 'all' ? undefined : action,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  const logs = data?.data?.logs || [];
  const total = data?.data?.total || 0;

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setOffset(0);
    setExpandedId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Audit Log</CardTitle>
            <CardDescription>Who changed what, when</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={entityType} onValueChange={handleFilterChange(setEntityType)}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="SafetyMetrics">Safety Metrics</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={handleFilterChange(setAction)}>
              <SelectTrigger className="w-40 bg-background">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg z-[100]">
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="import_create">Imported (new)</SelectItem>
                <SelectItem value="import_update">Imported (updated)</SelectItem>
                <SelectItem value="login">Logged in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit log entries match these filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold text-sm text-gray-700 w-8"></th>
                  <th className="text-left p-3 font-semibold text-sm text-gray-700">When</th>
                  <th className="text-left p-3 font-semibold text-sm text-gray-700">User</th>
                  <th className="text-left p-3 font-semibold text-sm text-gray-700">Action</th>
                  <th className="text-left p-3 font-semibold text-sm text-gray-700">Entity</th>
                  <th className="text-left p-3 font-semibold text-sm text-gray-700">Site</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <Fragment key={log.id}>
                    <tr
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="p-3">
                        {expandedId === log.id ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="text-gray-900">{log.user?.fullName || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">{log.user?.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{log.entityType}</td>
                      <td className="p-3 text-sm text-gray-600">{log.site?.siteName || '—'}</td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="border-b bg-gray-50">
                        <td></td>
                        <td colSpan={5} className="p-3">
                          <DiffSummary oldValues={log.oldValues} newValues={log.newValues} />
                          {(log.ipAddress || log.userAgent) && (
                            <div className="mt-2 text-xs text-gray-400">
                              {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                              {log.ipAddress && log.userAgent && <span> · </span>}
                              {log.userAgent && <span>{log.userAgent}</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>
                Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
