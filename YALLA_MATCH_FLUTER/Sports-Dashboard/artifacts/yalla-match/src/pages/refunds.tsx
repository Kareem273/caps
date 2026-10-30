import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, Download, RefreshCw, X } from 'lucide-react';
import { apiAdmin, apiGet, type ApiRefund, type ApiReservation } from '@/lib/yalla-api';
import { downloadRefundsReport } from '@/lib/report-export';
import { PageMotion } from '@/components/page-motion';

export default function Refunds() {
  const [refundRequests, setRefundRequests] = useState<ApiReservation[]>([]);
  const [refunds, setRefunds] = useState<ApiRefund[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const [requestsData, historyData] = await Promise.all([
        apiGet<ApiReservation[]>('/admin/refund-requests'),
        apiGet<ApiRefund[]>('/admin/refunds'),
      ]);
      setRefundRequests(requestsData);
      setRefunds(historyData);
      sessionStorage.setItem('yalla-pending-refund-requests', String(requestsData.length));
      window.dispatchEvent(new CustomEvent('yalla-refund-request-count', { detail: requestsData.length }));
    } catch {
      setError('Could not load refund data from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleApproveRefund = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiAdmin(`/admin/reservations/${id}/refund/approve`, 'POST', { reason: 'Approved by admin' });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve refund.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRefund = async (id: string) => {
    setActionLoadingId(id);
    try {
      await apiAdmin(`/admin/reservations/${id}/refund/reject`, 'POST', { reason: 'Rejected by admin' });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject refund.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AppLayout>
      <PageMotion loading={loading}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Refund Requests & History</h1>
            <p className="text-muted-foreground mt-1">Review pending customer refund requests, approve or reject them, and view processed refund history.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-card text-card-foreground hover:bg-muted border-border" onClick={loadData} disabled={loading}>
              <RefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm" onClick={() => downloadRefundsReport(refunds)} disabled={loading || refunds.length === 0}>
              <Download className="mr-2 w-4 h-4" /> Export Excel
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* 1. Pending Refund Requests Section */}
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="border-b bg-amber-500/10 py-3 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-amber-700 dark:text-amber-400">
                  Pending Refund Requests (مراجعة طلبات الريفاند)
                </CardTitle>
                {refundRequests.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {refundRequests.length} Pending
                  </Badge>
                )}
              </div>
              <Badge variant="outline">{refundRequests.length} request{refundRequests.length === 1 ? '' : 's'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {refundRequests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No pending refund requests awaiting review.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Refund Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.customerName || 'Guest'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.customerPhone || 'N/A'}</TableCell>
                      <TableCell>{req.courtName || 'Court'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{req.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {req.fromHour}:00 - {req.toHour}:00
                      </TableCell>
                      <TableCell className="font-semibold text-amber-600 dark:text-amber-400">
                        EGP {req.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm italic text-muted-foreground">
                        {req.rejectionReason || 'Refund requested by customer'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApproveRefund(req.id)}
                            disabled={actionLoadingId === req.id}
                          >
                            <Check className="mr-1 w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectRefund(req.id)}
                            disabled={actionLoadingId === req.id}
                          >
                            <X className="mr-1 w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 2. Processed Refund History Section */}
        <Card>
          <CardHeader className="border-b bg-muted/10 py-3 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Processed Refund History (سجل الاسترجاعات المقبولة)</CardTitle>
              <Badge variant="secondary">{refunds.length} refund{refunds.length === 1 ? '' : 's'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {refunds.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No processed refunds recorded yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead>Customer</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Refunded At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map(refund => (
                    <TableRow key={refund.id}>
                      <TableCell>{refund.customerName || 'Guest'}</TableCell>
                      <TableCell>{refund.courtName || 'Court'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{refund.date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{refund.fromHour}:00 - {refund.toHour}:00</TableCell>
                      <TableCell className="font-medium">EGP {refund.amount.toFixed(2)}</TableCell>
                      <TableCell>{refund.reason || 'No note'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(refund.refundedAtUtc).toLocaleString()}</TableCell>
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
