import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminService } from '@/services/admin.service';

const PAGE_SIZE = 50;

export default function ErrorLogViewer() {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['error-logs', page],
    queryFn: () => adminService.getErrorLogs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
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
              <AlertTriangle className="w-5 h-5" />
              Errors
            </CardTitle>
            <CardDescription>
              Unexpected failures only — crashes and 5xx responses. Everyday
              rejections (a wrong password, a denied permission) are normal and
              are not recorded here. Kept for 90 days.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading errors…</p>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">No errors recorded</p>
            <p className="text-sm text-gray-500 mt-1">
              Nothing has failed unexpectedly. This is the state you want.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((l: any) => {
                const isOpen = expanded === l.id;
                return (
                  <div key={l.id} className="border rounded-md">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : l.id)}
                      className="w-full flex items-start gap-2 p-3 text-left hover:bg-gray-50"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Messages are often multi-line (Prisma prints the
                            whole failing query) AND frequently begin with a
                            newline — so trim before taking the first line, or
                            the title renders empty. Done here rather than
                            relying on the server so that rows already stored
                            untrimmed still display correctly. */}
                        <p className="font-medium text-sm text-red-700 break-words">
                          {String(l.message || '').trim().split('\n')[0] || 'Unknown error'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(l.createdAt).toLocaleString()}
                          {l.method && l.path && (
                            <>
                              {' · '}
                              <span className="font-mono">
                                {l.method} {l.path}
                              </span>
                            </>
                          )}
                          {l.statusCode ? ` · ${l.statusCode}` : ''}
                          {l.userEmail ? ` · ${l.userEmail}` : ''}
                        </p>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t bg-gray-50 p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="text-gray-400">IP:</span> {l.ipAddress || '—'}
                          </div>
                          <div className="truncate">
                            <span className="text-gray-400">Agent:</span> {l.userAgent || '—'}
                          </div>
                        </div>
                        {/* Full message first — for Prisma errors this is the
                            genuinely useful part (it shows the failing query),
                            and the list above only showed its first line. */}
                        {String(l.message || '').includes('\n') && (
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1">Full message</p>
                            <pre className="text-[11px] leading-relaxed bg-white border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                              {l.message}
                            </pre>
                          </div>
                        )}
                        {l.stack ? (
                          <div>
                            <p className="text-[11px] font-medium text-gray-500 mb-1">Stack trace</p>
                            <pre className="text-[11px] leading-relaxed bg-white border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                              {l.stack}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">No stack trace recorded.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 text-sm text-gray-600">
              <span>
                {total.toLocaleString()} error{total === 1 ? '' : 's'} · page {page + 1} of {maxPage + 1}
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
