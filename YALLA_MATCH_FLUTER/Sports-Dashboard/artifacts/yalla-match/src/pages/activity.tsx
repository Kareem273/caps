import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Activity as ActivityIcon, ShieldCheck, UserCheck, Search, Filter } from 'lucide-react';
import { apiGet, type ApiAuditLog } from '@/lib/yalla-api';
import { downloadAuditLogsReport } from '@/lib/report-export';
import { PageMotion } from '@/components/page-motion';
import { Input } from '@/components/ui/input';

export default function Activity() {
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('yalla-admin-role') || 'Admin';
  const currentEmail = localStorage.getItem('yalla-admin-email') || '';

  useEffect(() => {
    void (async () => {
      setError('');
      setLoading(true);
      try {
        const data = await apiGet<ApiAuditLog[]>('/admin/audit-logs');
        setLogs(data || []);
      } catch {
        setError('Could not load activity log data from the API.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter logs according to role: SuperAdmin sees all admin logs; Regular Admin sees operational activity / own logs
  const roleFilteredLogs = userRole === 'SuperAdmin' 
    ? logs 
    : logs.filter(l => l.adminEmail.toLowerCase() === currentEmail.toLowerCase() || l.adminRole === 'Admin');

  // Search & Category Filter
  const visibleLogs = roleFilteredLogs.filter(log => {
    const matchesSearch = search === '' || 
      log.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || log.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', ...Array.from(new Set(roleFilteredLogs.map(l => l.category).filter(Boolean)))];

  return (
    <AppLayout>
      <PageMotion loading={loading}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <ActivityIcon className="h-6 w-6" />
              </span>
              <span>Activity &amp; Audit Log</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Real-time audit trail of administrator operations, logins, slot overrides, and payment confirmations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
              onClick={() => downloadAuditLogsReport(visibleLogs)}
              disabled={loading || visibleLogs.length === 0}
            >
              <Download className="mr-2 w-4 h-4" /> Export Excel
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Seamless Adaptive Role Banner (100% Theme Synchronized) */}
        {userRole === 'SuperAdmin' ? (
          <div className="rounded-2xl border border-amber-500/40 bg-card text-card-foreground p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                  <span>SuperAdmin Audit View</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Full visibility across all administrative accounts, operational modifications, and system-wide security events.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold px-3 py-1 text-xs rounded-full self-start sm:self-center shrink-0">
              SuperAdmin View
            </Badge>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/40 bg-card text-card-foreground p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/30 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                  <span>Admin Activity View</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Displaying your facility operations, payment validations, and court slot schedule changes.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary font-semibold px-3 py-1 text-xs rounded-full self-start sm:self-center shrink-0">
              Admin View
            </Badge>
          </div>
        )}

        {/* Filter & Search Bar */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin email, action, details..."
                className="pl-10 h-10 bg-background text-foreground border-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <div className="flex flex-wrap gap-1.5">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    className={`h-9 text-xs rounded-full px-3 transition-colors ${
                      categoryFilter === cat 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/20 py-3.5 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                Activity Logs &amp; Audit Trail
              </CardTitle>
              <Badge variant="secondary" className="font-medium text-xs">
                {visibleLogs.length} {visibleLogs.length === 1 ? 'record' : 'records'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading activity logs…</div>
            ) : visibleLogs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No activity records found matching the current filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-b border-border/80">
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="min-w-[280px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-sm">
                        {log.adminEmail}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.adminRole === 'SuperAdmin' ? 'default' : 'outline'} 
                          className={log.adminRole === 'SuperAdmin' ? 'bg-amber-600 text-white border-transparent' : 'border-border text-foreground'}
                        >
                          {log.adminRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-xs">
                          {log.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground text-sm">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md leading-relaxed">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      </PageMotion>
    </AppLayout>
  );
}
