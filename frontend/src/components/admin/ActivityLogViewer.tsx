import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { adminService } from '@/services/admin.service';

const PAGE_SIZE = 100;

// Colour by outcome, not by verb: when scanning a long list you are looking for
// what failed, not what method was used.
function statusClasses(code: number) {
  if (code >= 500) return 'bg-red-100 text-red-700';
  if (code === 429) return 'bg-orange-100 text-orange-700';
  if (code >= 400) return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
}

function durationClasses(ms: number) {
  if (ms >= 3000) return 'text-red-600 font-medium';
  if (ms >= 1000) return 'text-amber-600';
  return 'text-gray-500';
}

export default function ActivityLogViewer() {
  const [pathFilter, setPathFilter] = useState('');
  const [statusClass, setStatusClass] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['request-logs', pathFilter, statusClass, page],
    queryFn: () =>
      adminService.getRequestLogs({
        path: pathFilter || undefined,
        statusClass: statusClass || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const logs = data?.data?.logs ?? [];
  const total = data?.data?.total ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity
            </CardTitle>
            <CardDescription>
              Every API request — who, what, the result and how long it took.
              Kept for 14 days, then pruned automatically.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Filter by path, e.g. /api/admin/users"
              className="pl-8"
              value={pathFilter}
              onChange={(e) => {
                setPathFilter(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            value={statusClass}
            onChange={(e) => {
              setStatusClass(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All results</option>
            <option value="2">Success (2xx)</option>
            <option value="4">Client errors (4xx)</option>
            <option value="5">Server errors (5xx)</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading activity…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No requests match this filter.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">When</th>
                    <th className="px-3 py-2 text-left font-medium">User</th>
                    <th className="px-3 py-2 text-left font-medium">Request</th>
                    <th className="px-3 py-2 text-left font-medium">Result</th>
                    <th className="px-3 py-2 text-right font-medium">Time</th>
                    <th className="px-3 py-2 text-left font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {l.userEmail || <span className="text-gray-400">anonymous</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        <span className="text-gray-500 mr-1">{l.method}</span>
                        {l.path}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClasses(l.statusCode)}`}>
                          {l.statusCode}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right whitespace-nowrap ${durationClasses(l.durationMs)}`}>
                        {l.durationMs} ms
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{l.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
              <span>
                {total.toLocaleString()} request{total === 1 ? '' : 's'} · page {page + 1} of {maxPage + 1}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
