import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Ban, CalendarDays, CheckCircle2, Clock, Download, FileText,
  Filter, Grid, Image as ImageIcon, MapPin, RotateCcw, Search, Undo2, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { ChartModalWrapper } from '@/components/chart-modal';
import { StatCard } from '@/components/stat-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiAdmin, apiGet, type ApiCourt, type ApiDashboardOverview, type ApiDashboardSummary, type ApiRefund, type ApiReservation } from '@/lib/yalla-api';
import { downloadExcelReport, downloadPdfReport } from '@/lib/report-export';
import { ReservationDetailsDialog } from '@/components/reservation-details-dialog';

type Filters = { dateFrom: string; dateTo: string; court: string; status: string; payment: string; query: string };
type DialogReservation = { id: string; customer: string; court: string; date: string; time: string; status: string; amount: number };

const defaultFilters: Filters = { dateFrom: '', dateTo: '', court: 'all', status: 'all', payment: 'all', query: '' };

const statusLabel = (status: string) => ({
  AwaitingPaymentScreenshot: 'Awaiting payment',
  PendingPaymentVerification: 'Pending review',
  Confirmed: 'Confirmed',
  CheckedIn: 'Checked in',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
}[status] ?? status);

const paymentLabel = (payment: string) => ({
  NotUploaded: 'Not uploaded',
  PendingVerification: 'Pending verification',
  Approved: 'Paid',
  Rejected: 'Rejected',
  Refunded: 'Refunded',
}[payment] ?? payment);

const isActiveReservation = (reservation: ApiReservation) => !['Cancelled', 'Rejected'].includes(reservation.status);
const duration = (reservation: ApiReservation) => Math.max(0, reservation.toHour - reservation.fromHour + 1);
const toDialogRows = (reservations: ApiReservation[]): DialogReservation[] => reservations.map(reservation => ({
  id: reservation.id.slice(0, 8),
  customer: reservation.customerName || 'Guest',
  court: reservation.courtName || 'Court',
  date: reservation.date,
  time: `${reservation.fromHour}:00 - ${reservation.toHour}:00`,
  status: statusLabel(reservation.status),
  amount: Number(reservation.price || 0),
}));

function applyFilters(filters: Filters, reservations: ApiReservation[]) {
  const q = filters.query.trim().toLowerCase();
  return reservations.filter(reservation => {
    if (filters.dateFrom && reservation.date < filters.dateFrom) return false;
    if (filters.dateTo && reservation.date > filters.dateTo) return false;
    if (filters.court !== 'all' && reservation.courtId !== filters.court) return false;
    if (filters.status !== 'all' && reservation.status !== filters.status) return false;
    if (filters.payment !== 'all' && reservation.paymentStatus !== filters.payment) return false;
    if (q) {
      const hay = `${reservation.id} ${reservation.customerName || ''} ${reservation.courtName || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function hasNotStarted(reservation: ApiReservation) {
  const start = new Date(`${reservation.date}T${String(reservation.fromHour).padStart(2, '0')}:00:00`);
  return !Number.isNaN(start.getTime()) && start > new Date();
}

export default function Dashboard() {
  const [draft, setDraft] = useState<Filters>(defaultFilters);
  const [applied, setApplied] = useState<Filters>(defaultFilters);
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [refunds, setRefunds] = useState<ApiRefund[]>([]);
  const [summary, setSummary] = useState<ApiDashboardSummary>({ activeCourts: 0, blockedSlots: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReservation, setRefundReservation] = useState<ApiReservation | null>(null);
  const [refundReason, setRefundReason] = useState('Refunded before the booking start time.');
  const [refundSaving, setRefundSaving] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ApiReservation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await apiGet<ApiDashboardOverview>('/dashboard/overview');
      setReservations(overview.reservations);
      setCourts(overview.courts);
      setSummary(overview.summary);
      setRefunds(overview.refunds);
      sessionStorage.setItem('yalla-pending-refund-requests', String(overview.pendingRefundRequestsCount));
      window.dispatchEvent(new CustomEvent('yalla-refund-request-count', { detail: overview.pendingRefundRequestsCount }));
    } catch {
      setError('Dashboard data could not be loaded from the API. Please refresh and sign in again if needed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => applyFilters(applied, reservations), [applied, reservations]);
  const dialogRows = useMemo(() => toDialogRows(filtered), [filtered]);
  const today = new Date().toISOString().slice(0, 10);
  const courtOptions = useMemo(() => [{ id: 'all', name: 'All courts' }, ...courts.map(court => ({ id: court.id, name: court.name }))], [courts]);
  const statusOptions = useMemo(() => [...new Set(reservations.map(reservation => reservation.status))], [reservations]);
  const paymentOptions = useMemo(() => [...new Set(reservations.map(reservation => reservation.paymentStatus))], [reservations]);

  const stats = useMemo(() => {
    const active = filtered.filter(isActiveReservation);
    const confirmedList = filtered.filter(reservation => reservation.status === 'Confirmed' || reservation.paymentStatus === 'Approved');
    return {
      total: confirmedList.length,
      confirmed: confirmedList.length,
      pending: filtered.filter(reservation => reservation.paymentStatus === 'PendingVerification').length,
      cancelled: filtered.filter(reservation => reservation.status === 'Cancelled').length,
      rejected: filtered.filter(reservation => reservation.paymentStatus === 'Rejected').length,
      revenue: filtered.filter(reservation => reservation.paymentStatus === 'Approved').reduce((sum, reservation) => sum + Number(reservation.price || 0), 0),
      hours: active.reduce((sum, reservation) => sum + duration(reservation), 0),
      todayBookings: confirmedList.filter(reservation => reservation.date === today).length,
    };
  }, [filtered, today]);

  const revenueSeries = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.filter(reservation => reservation.paymentStatus === 'Approved').forEach(reservation => {
      totals[reservation.date] = (totals[reservation.date] || 0) + Number(reservation.price || 0);
    });
    return Object.entries(totals).sort(([left], [right]) => left.localeCompare(right)).map(([name, revenue]) => ({ name, revenue }));
  }, [filtered]);

  const hoursSeries = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.filter(isActiveReservation).forEach(reservation => {
      totals[reservation.date] = (totals[reservation.date] || 0) + duration(reservation);
    });
    return Object.entries(totals).sort(([left], [right]) => left.localeCompare(right)).map(([name, hours]) => ({ name, hours }));
  }, [filtered]);

  const bookingsByCourt = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach(reservation => {
      const court = reservation.courtName || 'Unknown court';
      totals[court] = (totals[court] || 0) + 1;
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value);
  }, [filtered]);

  const statusDistribution = useMemo(() => {
    const totals: Record<string, number> = {};
    filtered.forEach(reservation => { totals[statusLabel(reservation.status)] = (totals[statusLabel(reservation.status)] || 0) + 1; });
    const colors = ['#059669', '#10b981', '#34d399', '#065f46', '#6ee7b7', '#047857', '#a7f3d0'];
    return Object.entries(totals).map(([name, value], index) => ({ name, value, fill: colors[index % colors.length] }));
  }, [filtered]);

  const pendingReviews = useMemo(() => reservations.filter(reservation =>
    Boolean(reservation.paymentScreenshotUrl) &&
    reservation.paymentStatus !== 'Approved' &&
    reservation.status !== 'Confirmed' &&
    reservation.status !== 'Cancelled' &&
    reservation.status !== 'Rejected'
  ), [reservations]);
  const refundableBookings = useMemo(() => reservations.filter(reservation =>
    reservation.status === 'Confirmed' && reservation.paymentStatus === 'Approved' && hasNotStarted(reservation),
  ), [reservations]);
  const topCourts = useMemo(() => bookingsByCourt.slice(0, 3), [bookingsByCourt]);
  const maxBookings = topCourts[0]?.value || 1;
  const activity = useMemo(() => [...reservations]
    .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc))
    .slice(0, 5), [reservations]);

  const reviewPayment = async (reservation: ApiReservation, approved: boolean, customReason?: string) => {
    try {
      if (approved) {
        await apiAdmin(`/admin/reservations/${reservation.id}/approve-payment`, 'POST');
      } else {
        const reason = customReason ?? window.prompt('Reason for rejecting this payment?', 'Payment could not be verified.');
        if (reason === null) return;
        await apiAdmin(`/admin/reservations/${reservation.id}/reject-payment`, 'POST', { reason });
      }
      await load();
    } catch {
      setError('The payment review could not be saved.');
    }
  };

  const openRefundDialog = (reservation: ApiReservation) => {
    setRefundReservation(reservation);
    setRefundReason('Refunded before the booking start time.');
    setError('');
    setRefundDialogOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (!refundReservation) return;
    setRefundSaving(true);
    setError('');
    try {
      await apiAdmin(`/admin/reservations/${refundReservation.id}/refund`, 'POST', { reason: refundReason });
      setRefundDialogOpen(false);
      setRefundReservation(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The refund request could not be submitted.');
    } finally {
      setRefundSaving(false);
    }
  };

  const isFiltered = Object.values(applied).some(value => value !== '' && value !== 'all');

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Live performance data from your Yalla Match database.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-card text-card-foreground hover:bg-muted border-border" onClick={() => downloadPdfReport(filtered)} disabled={loading}>
              <Download className="mr-2 w-4 h-4" /> Export PDF
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm" onClick={() => downloadExcelReport(filtered)} disabled={loading}>
              <FileText className="mr-2 w-4 h-4" /> Export Excel
            </Button>
          </div>
        </div>

        {error && <Card className="border-destructive/30"><CardContent className="p-4 flex justify-between items-center gap-4 text-sm text-destructive"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card>}

        <Card className="bg-card shadow-sm border-border/60 text-card-foreground">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Filter className="w-4 h-4" /> Filters</div>
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search by ID, customer, court..." className="pl-9 h-9" value={draft.query} onChange={e => setDraft(v => ({ ...v, query: e.target.value }))} /></div>
            <Input type="date" className="w-auto h-9 text-sm" value={draft.dateFrom} onChange={event => setDraft(value => ({ ...value, dateFrom: event.target.value }))} />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" className="w-auto h-9 text-sm" value={draft.dateTo} onChange={event => setDraft(value => ({ ...value, dateTo: event.target.value }))} />
            <Select value={draft.court} onValueChange={court => setDraft(value => ({ ...value, court }))}><SelectTrigger className="w-[165px] h-9"><SelectValue placeholder="Court" /></SelectTrigger><SelectContent>{courtOptions.map(court => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}</SelectContent></Select>
            <Select value={draft.status} onValueChange={status => setDraft(value => ({ ...value, status }))}><SelectTrigger className="w-[165px] h-9"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statusOptions.map(status => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select>
            <Select value={draft.payment} onValueChange={payment => setDraft(value => ({ ...value, payment }))}><SelectTrigger className="w-[175px] h-9"><SelectValue placeholder="Payment" /></SelectTrigger><SelectContent><SelectItem value="all">All payments</SelectItem>{paymentOptions.map(payment => <SelectItem key={payment} value={payment}>{paymentLabel(payment)}</SelectItem>)}</SelectContent></Select>
            <div className="flex-1" />
            {isFiltered && <Badge variant="secondary">{filtered.length} matching records</Badge>}
            <Button size="sm" variant="outline" onClick={() => { setDraft(defaultFilters); setApplied(defaultFilters); }}>Reset</Button>
            <Button size="sm" onClick={() => setApplied({ ...draft })}>Apply filters</Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard delay={0} title="Total Bookings" value={stats.total} icon={<Grid className="w-5 h-5" />} reservations={toDialogRows(filtered.filter(reservation => reservation.status === 'Confirmed' || reservation.paymentStatus === 'Approved'))} formula={`Count of confirmed reservations after applied filters`} />
          <StatCard delay={0.1} title="Pending Payments" value={stats.pending} icon={<Clock className="w-5 h-5" />} reservations={toDialogRows(filtered.filter(reservation => reservation.paymentStatus === 'PendingVerification'))} formula={`Reservations with paymentStatus === 'PendingVerification'`} />
          <StatCard delay={0.2} title="Total Revenue" value={`EGP ${stats.revenue.toLocaleString()}`} icon={<Wallet className="w-5 h-5" />} reservations={toDialogRows(filtered.filter(reservation => reservation.paymentStatus === 'Approved'))} formula={`Sum(price) for reservations where paymentStatus === 'Approved'`} />
          <StatCard delay={0.3} title="Available Courts" value={summary.activeCourts || courts.length} icon={<MapPin className="w-5 h-5" />} courts={courts} formula={`Number of active courts available in the system`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>Paid reservations only</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartModalWrapper title="Revenue details" reservations={dialogRows}>
                <div className="h-[300px] w-full">
                  {revenueSeries.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueSeries}>
                        <defs>
                          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value: number) => (Number(value) === 0 ? '' : `EGP ${value}`)} />
                        <RechartsTooltip formatter={(value: number) => (Number(value) === 0 ? ['', 'Revenue'] : [`EGP ${value.toLocaleString()}`, 'Revenue'])} />
                        <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#revenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartModalWrapper>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Reservation Distribution</CardTitle><CardDescription>Current filtered status breakdown</CardDescription></CardHeader><CardContent><ChartModalWrapper title="Status distribution" reservations={dialogRows}><div className="h-[300px]">{statusDistribution.length === 0 ? <EmptyChart /> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>{statusDistribution.map(entry => <Cell key={entry.name} fill={entry.fill} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer>}</div></ChartModalWrapper><div className="flex flex-wrap justify-center gap-3 mt-2">{statusDistribution.map(entry => <span key={entry.name} className="flex items-center gap-1 text-xs text-muted-foreground"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />{entry.name}</span>)}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Refund Requests</CardTitle>
            <CardDescription>Submit a refund request for confirmed paid bookings before the reservation starts.</CardDescription>
          </CardHeader>
          <CardContent>
            {refundableBookings.length === 0 ? <EmptyState message="No refundable reservations available." /> : (
              <div className="divide-y">
                {refundableBookings.map(reservation => (
                  <div key={reservation.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{reservation.customerName || 'Guest'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{reservation.courtName || 'Court'} • {reservation.date} • {reservation.fromHour}:00 - {reservation.toHour}:00</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm text-foreground">EGP {Number(reservation.price).toLocaleString()}</span>
                      <Button size="sm" variant="outline" onClick={() => openRefundDialog(reservation)}>Request refund</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request refund</DialogTitle>
              <DialogDescription>Record a refund request for the selected reservation.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border border-border p-4 bg-muted/50">
                <p className="text-sm font-semibold">{refundReservation?.customerName || 'Guest'}</p>
                <p className="text-xs text-muted-foreground">{refundReservation?.courtName || 'Court'} • {refundReservation?.date} • {refundReservation?.fromHour}:00 - {refundReservation?.toHour}:00</p>
                <p className="text-sm mt-2">Amount: EGP {refundReservation ? Number(refundReservation.price).toLocaleString() : ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Refund reason</label>
                <Textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" className="bg-card text-card-foreground font-semibold border-input hover:bg-muted" onClick={() => setRefundDialogOpen(false)} disabled={refundSaving}>Cancel</Button>
              <Button type="button" className="bg-card text-card-foreground font-semibold border-input hover:bg-muted shadow-sm" onClick={handleRefundSubmit} disabled={refundSaving}>
                {refundSaving ? 'Submitting…' : 'Submit refund request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Payment Review
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Payments with uploaded receipts awaiting verification.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pendingReviews.length > 0 ? "warning" : "secondary"}>
                    {pendingReviews.length} pending
                  </Badge>
                  <Button size="sm" variant="outline" className="h-8 text-xs bg-card text-card-foreground border-border hover:bg-muted" asChild>
                    <a href="/reservations?receipt=only">Review in Reservations →</a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReviews.length === 0 ? (
                <EmptyState message="No payments need review." />
              ) : (
                <div className="divide-y">
                  {pendingReviews.map(reservation => (
                    <div key={reservation.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedReservation(reservation)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {(reservation.customerName || 'G').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{reservation.customerName || 'Guest'}</p>
                            <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-normal">Pending</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {reservation.courtName || 'Court'} • {reservation.date} • {reservation.fromHour}:00 - {reservation.toHour}:00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-sm font-semibold text-foreground">
                          EGP {Number(reservation.price).toLocaleString()}
                        </span>
                        {reservation.paymentScreenshotUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs bg-card text-card-foreground border-border hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReservation(reservation);
                            }}
                          >
                            <ImageIcon className="w-3.5 h-3.5 mr-1" /> Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ReservationDetailsDialog
          reservation={selectedReservation}
          open={Boolean(selectedReservation)}
          onOpenChange={(open) => !open && setSelectedReservation(null)}
          onApprove={(res) => reviewPayment(res, true)}
          onReject={(res, reason) => reviewPayment(res, false, reason)}
        />
      </div>
    </AppLayout>
  );
}

function EmptyChart() { return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data for the current filters.</div>; }
function EmptyState({ message }: { message: string }) { return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>; }
