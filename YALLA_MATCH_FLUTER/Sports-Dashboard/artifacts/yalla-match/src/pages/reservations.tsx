import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Download, Lock, LockOpen, Plus, Search, X, Check, Image as ImageIcon } from 'lucide-react';
import { apiAdmin, apiGet, type ApiCourt, type ApiReservation } from '@/lib/yalla-api';
import { downloadExcelReport } from '@/lib/report-export';
import { PageMotion } from '@/components/page-motion';
import { ReservationDetailsDialog } from '@/components/reservation-details-dialog';

type Slot = { hour: number; status: 'Available' | 'Blocked' | 'Booked'; reservationId?: string; blockId?: string; expired?: boolean };
type OfflineBooking = { customerName: string; customerPhone: string; fromHour: string; toHour: string };

const today = () => new Date().toISOString().slice(0, 10);
const formatHour = (hour: number) => `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
const hours = Array.from({ length: 24 }, (_, hour) => hour);
const emptyBooking: OfflineBooking = { customerName: '', customerPhone: '', fromHour: '18', toHour: '18' };

export default function Reservations() {
  const queryParams = new URLSearchParams(window.location.search);
  const requestedCourt = queryParams.get('court') || '';
  const requestedReceipt = queryParams.get('receipt') === 'only' || queryParams.get('hasReceipt') === 'true';
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [courtFilter, setCourtFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState(queryParams.get('payment') || 'all');
  const [onlyWithReceipt, setOnlyWithReceipt] = useState(requestedReceipt);
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [scheduleCourtId, setScheduleCourtId] = useState(requestedCourt);
  const [scheduleDate, setScheduleDate] = useState(today());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [blockReason, setBlockReason] = useState('');
  const [slotAction, setSlotAction] = useState<'book' | 'block'>('book');
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [booking, setBooking] = useState<OfflineBooking>(emptyBooking);
  const [selectedReservation, setSelectedReservation] = useState<ApiReservation | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const [courtData, reservationData] = await Promise.all([
        apiGet<ApiCourt[]>('/courts'),
        apiGet<ApiReservation[]>('/reservations'),
      ]);
      setCourts(courtData);
      setReservations(reservationData);
      setScheduleCourtId(current => current || courtData[0]?.id || '');
    } catch {
      setError('Could not load reservations and courts from the API.');
    } finally {
      setLoading(false);
    }
  };

  const reviewPayment = async (reservation: ApiReservation, approved: boolean, customReason?: string) => {
    try {
      if (approved) {
        await apiAdmin(`/admin/reservations/${reservation.id}/approve-payment`, 'POST');
      } else {
        const reason = customReason ?? window.prompt('Reason for rejecting this payment?', 'Payment could not be verified.');
        if (reason === null) return;
        await apiAdmin(`/admin/reservations/${reservation.id}/reject-payment`, 'POST', { reason });
      }
      await loadData();
    } catch {
      setError('The payment review could not be saved.');
    }
  };

  const loadSlots = async () => {
    if (!scheduleCourtId) {
      setSlots([]);
      return;
    }
    try {
      const data = await apiGet<Slot[]>(`/courts/${scheduleCourtId}/slots?date=${scheduleDate}`);
      setSlots(data);
    } catch {
      setError('Could not load the selected court schedule.');
    }
  };

  useEffect(() => { void loadData(); }, []);
  useEffect(() => { void loadSlots(); }, [scheduleCourtId, scheduleDate]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return reservations.filter(reservation => {
      if (query && !reservation.id.toLowerCase().includes(query) && !(reservation.customerName || '').toLowerCase().includes(query) && !(reservation.courtName || '').toLowerCase().includes(query)) return false;
      if (filterDate && reservation.date !== filterDate) return false;
      if (courtFilter !== 'all' && reservation.courtId !== courtFilter) return false;
      if (status !== 'all' && reservation.status !== status) return false;
      if (onlyWithReceipt && !reservation.paymentScreenshotUrl) return false;
      if (payment === 'has_receipt') {
        if (!reservation.paymentScreenshotUrl) return false;
      } else if (payment !== 'all' && reservation.paymentStatus !== payment) {
        return false;
      }
      return true;
    });
  }, [search, filterDate, courtFilter, status, payment, onlyWithReceipt, reservations]);

  const statusOptions = useMemo(() => [...new Set(reservations.map(reservation => reservation.status))], [reservations]);
  const paymentOptions = useMemo(() => [...new Set(reservations.map(reservation => reservation.paymentStatus))], [reservations]);
  const selectedCourt = courts.find(court => court.id === scheduleCourtId);
  const isFiltered = Boolean(search || filterDate || courtFilter !== 'all' || status !== 'all' || payment !== 'all' || onlyWithReceipt);

  const resetFilters = () => { setSearch(''); setFilterDate(''); setCourtFilter('all'); setStatus('all'); setPayment('all'); setOnlyWithReceipt(false); };

  const blockOrUnblock = async (slot: Slot) => {
    if (!scheduleCourtId || slot.status === 'Booked') return;
    try {
      if (slot.status === 'Blocked') {
        await apiAdmin(`/admin/courts/${scheduleCourtId}/slots/block?date=${scheduleDate}&hour=${slot.hour}`, 'DELETE');
      } else {
        await apiAdmin(`/admin/courts/${scheduleCourtId}/slots/block`, 'POST', { date: scheduleDate, fromHour: slot.hour, toHour: slot.hour, reason: blockReason || null });
      }
      setBlockReason('');
      await loadSlots();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The slot could not be updated.');
    }
  };

  const openOfflineBooking = (hour?: number) => {
    if (!scheduleCourtId) {
      setError('Select a court before creating an offline booking.');
      return;
    }
    const selectedHour = hour ?? 18;
    setBooking({ customerName: '', customerPhone: '', fromHour: String(selectedHour), toHour: String(selectedHour) });
    setOfflineOpen(true);
  };

  const createOfflineBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleCourtId) return;
    const fromHour = Number(booking.fromHour);
    const toHour = Number(booking.toHour);
    if (!booking.customerPhone.trim()) {
      setError('Customer phone is required for offline bookings.');
      return;
    }
    if (!Number.isInteger(fromHour) || !Number.isInteger(toHour) || toHour < fromHour) {
      setError('Choose a valid start and end hour.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiAdmin('/admin/reservations/offline', 'POST', {
        courtId: scheduleCourtId,
        date: scheduleDate,
        fromHour,
        toHour,
        customerName: booking.customerName.trim() || null,
        customerPhone: booking.customerPhone.trim() || null,
      });
      setOfflineOpen(false);
      await Promise.all([loadData(), loadSlots()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the offline booking.');
    } finally {
      setSaving(false);
    }
  };

  return <AppLayout><PageMotion loading={loading}><div className="flex flex-col gap-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h1 className="text-3xl font-bold tracking-tight text-foreground">Reservations &amp; Slots</h1><p className="text-muted-foreground mt-1">Manage bookings, court availability, and owner walk-in reservations in one place.</p></div><div className="flex gap-2"><Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm" onClick={() => downloadExcelReport(filtered)}><Download className="mr-2 w-4 h-4" />Export Excel</Button><Button variant="outline" className="bg-card hover:bg-muted text-card-foreground border border-input shadow-xs" onClick={() => openOfflineBooking()}><Plus className="mr-2 w-4 h-4" />Offline booking</Button></div></div>
    {error && <p className="text-sm text-destructive">{error}</p>}

    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="w-4 h-4 text-primary" />Court schedule</CardTitle></CardHeader><CardContent className="p-4 space-y-4"><div className="grid sm:grid-cols-3 gap-4"><div><Label>Court</Label><Select value={scheduleCourtId} onValueChange={setScheduleCourtId}><SelectTrigger className="mt-2"><SelectValue placeholder="Select court" /></SelectTrigger><SelectContent>{courts.map(court => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Date</Label><Input className="mt-2" type="date" value={scheduleDate} onChange={event => setScheduleDate(event.target.value)} /></div><div><Label>Block reason (optional)</Label><Input className="mt-2" value={blockReason} onChange={event => setBlockReason(event.target.value)} placeholder="Maintenance" /></div></div><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground mr-2">Available-hour action:</span><Button size="sm" variant={slotAction === 'book' ? 'default' : 'outline'} onClick={() => setSlotAction('book')}><Plus className="w-3 h-3 mr-1" />Book offline</Button><Button size="sm" variant={slotAction === 'block' ? 'default' : 'outline'} onClick={() => setSlotAction('block')}><Lock className="w-3 h-3 mr-1" />Block slot</Button></div><p className="text-sm text-muted-foreground">{selectedCourt ? `Click an available hour to ${slotAction === 'book' ? `book it offline for ${selectedCourt.name}` : 'block it'}.` : 'Select a court to see its schedule.'} Blocked hours can be opened again.</p><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{slots.map(slot => <button key={slot.hour} disabled={slot.status === 'Booked'} onClick={() => slot.status === 'Available' ? (slotAction === 'book' ? openOfflineBooking(slot.hour) : void blockOrUnblock(slot)) : void blockOrUnblock(slot)} className={`rounded-xl border p-3 text-left transition-colors ${slot.status === 'Available' ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50' : slot.status === 'Blocked' ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50' : 'bg-muted/40 text-muted-foreground border-border/40 opacity-60 cursor-not-allowed'}`}><b className="text-sm">{formatHour(slot.hour)}</b><span className="block text-xs mt-1">{slot.status === 'Booked' ? 'Booked' : slot.status === 'Blocked' ? <><LockOpen className="inline w-3 h-3 mr-1" />Open slot</> : slotAction === 'book' ? <><Plus className="inline w-3 h-3 mr-1" />Book offline</> : <><Lock className="inline w-3 h-3 mr-1" />Block slot</>}</span></button>)}</div><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-emerald-500" />Available</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-red-500" />Blocked</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded bg-muted-foreground" />Booked</span></div></CardContent></Card>

    <Card className="bg-card shadow-sm border-border/60 text-card-foreground"><CardContent className="p-4"><div className="flex flex-wrap items-center gap-3"><div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search by ID, customer, court..." className="pl-9 h-9" value={search} onChange={event => setSearch(event.target.value)} /></div><Input type="date" className="w-auto h-9 text-sm" value={filterDate} onChange={event => setFilterDate(event.target.value)} /><Select value={courtFilter} onValueChange={setCourtFilter}><SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Court" /></SelectTrigger><SelectContent><SelectItem value="all">All courts</SelectItem>{courts.map(court => <SelectItem key={court.id} value={court.id}>{court.name}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statusOptions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={payment} onValueChange={setPayment}><SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Payment" /></SelectTrigger><SelectContent><SelectItem value="all">All payments</SelectItem><SelectItem value="has_receipt">Has Receipt (مع إيصال)</SelectItem>{paymentOptions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Button size="sm" variant={onlyWithReceipt ? "default" : "outline"} className={`h-9 gap-1.5 font-medium ${onlyWithReceipt ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'}`} onClick={() => setOnlyWithReceipt(!onlyWithReceipt)} title="Show only reservations with uploaded receipts"><ImageIcon className="w-3.5 h-3.5" />{onlyWithReceipt ? 'With Receipt (Active)' : 'With Receipt Only'}</Button>{isFiltered && <Button size="sm" variant="outline" className="h-9 bg-white text-muted-foreground gap-1" onClick={resetFilters}><X className="w-3.5 h-3.5" />Clear</Button>}</div></CardContent></Card>

    <Card><CardHeader className="border-b bg-muted/10 py-3 px-6"><div className="flex items-center justify-between"><CardTitle className="text-base font-semibold">All Reservations</CardTitle><Badge variant="secondary">{filtered.length} booking{filtered.length === 1 ? '' : 's'}</Badge></div></CardHeader><CardContent className="p-0">{filtered.length === 0 ? <div className="py-16 text-center text-muted-foreground text-sm">No reservations match your filters.</div> : <Table><TableHeader><TableRow className="bg-muted/10"><TableHead>Customer</TableHead><TableHead>Court</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead>Amount</TableHead><TableHead className="text-right">Payment Action</TableHead></TableRow></TableHeader><TableBody>{filtered.map(reservation => <TableRow key={reservation.id} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => setSelectedReservation(reservation)}><TableCell><div className="flex items-center gap-2"><Avatar className="w-6 h-6"><AvatarFallback className="text-[10px] bg-secondary">{(reservation.customerName || 'Guest').split(' ').map(name => name[0]).join('')}</AvatarFallback></Avatar>{reservation.customerName || 'Guest'}</div></TableCell><TableCell className="font-medium">{reservation.courtName || 'Court'}</TableCell><TableCell className="whitespace-nowrap text-sm">{reservation.date}</TableCell><TableCell className="text-sm text-muted-foreground whitespace-nowrap">{reservation.fromHour}:00 - {reservation.toHour}:00</TableCell><TableCell><Badge variant="outline">{reservation.source || 'Online'}</Badge></TableCell><TableCell><Badge variant={reservation.status === 'Confirmed' ? 'success' : reservation.status.includes('Pending') || reservation.status.includes('Awaiting') ? 'warning' : reservation.status === 'Cancelled' ? 'destructive' : 'secondary'}>{reservation.status}</Badge></TableCell><TableCell><Badge variant="outline" className="font-normal text-muted-foreground bg-background">{reservation.paymentStatus}</Badge></TableCell><TableCell className="font-medium">EGP {reservation.price}</TableCell><TableCell className="text-right whitespace-nowrap">{reservation.paymentStatus === 'PendingVerification' ? (<div className="flex items-center justify-end gap-1.5">{reservation.paymentScreenshotUrl && (<Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-card text-card-foreground border-border hover:bg-muted" onClick={(e) => { e.stopPropagation(); setSelectedReservation(reservation); }} title="View Receipt & Details"><ImageIcon className="w-3.5 h-3.5 mr-1" />Receipt</Button>)}<Button size="sm" className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs" onClick={(e) => { e.stopPropagation(); void reviewPayment(reservation, true); }} title="Approve Payment"><Check className="w-3.5 h-3.5 mr-1" />Approve</Button><Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 bg-white" onClick={(e) => { e.stopPropagation(); void reviewPayment(reservation, false); }} title="Reject Payment"><X className="w-3.5 h-3.5 mr-1" />Reject</Button></div>) : reservation.paymentStatus === 'Approved' ? (<div className="flex items-center justify-end gap-1.5">{reservation.paymentScreenshotUrl && (<Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-card text-card-foreground border-border hover:bg-muted" onClick={(e) => { e.stopPropagation(); setSelectedReservation(reservation); }} title="View Receipt & Details"><ImageIcon className="w-3.5 h-3.5" /></Button>)}<span className="text-xs text-emerald-600 font-medium">Approved ✓</span></div>) : reservation.paymentStatus === 'Rejected' ? (<span className="text-xs text-rose-500 font-medium">Rejected ✗</span>) : (<span className="text-xs text-muted-foreground">—</span>)}</TableCell></TableRow>)}</TableBody></Table> }</CardContent></Card>

    <Dialog open={offlineOpen} onOpenChange={setOfflineOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Offline booking</DialogTitle>
          <DialogDescription>
            {selectedCourt ? `${selectedCourt.name} on ${scheduleDate}` : 'Select a court and date first.'}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={createOfflineBooking}>
          <div className="grid gap-2">
            <Label htmlFor="offline-customer">Customer name</Label>
            <Input
              id="offline-customer"
              className="bg-card text-card-foreground border-input placeholder:text-muted-foreground"
              value={booking.customerName}
              onChange={event => setBooking(current => ({ ...current, customerName: event.target.value }))}
              placeholder="Walk-in customer"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="offline-phone">
              Customer phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="offline-phone"
              className="bg-card text-card-foreground border-input placeholder:text-muted-foreground"
              value={booking.customerPhone}
              onChange={event => setBooking(current => ({ ...current, customerPhone: event.target.value }))}
              placeholder="+20 10 0000 0000"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>From</Label>
              <Select
                value={booking.fromHour}
                onValueChange={value => setBooking(current => ({ ...current, fromHour: value, toHour: Number(current.toHour) < Number(value) ? value : current.toHour }))}
              >
                <SelectTrigger className="bg-card text-card-foreground border-border hover:bg-muted [&>svg]:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.map(hour => <SelectItem key={hour} value={String(hour)}>{formatHour(hour)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Select
                value={booking.toHour}
                onValueChange={value => setBooking(current => ({ ...current, toHour: value }))}
              >
                <SelectTrigger className="bg-card text-card-foreground border-border hover:bg-muted [&>svg]:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hours.filter(hour => hour >= Number(booking.fromHour)).map(hour => <SelectItem key={hour} value={String(hour)}>{formatHour(hour)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="bg-card text-card-foreground font-semibold border-input hover:bg-muted hover:text-black"
              onClick={() => setOfflineOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-card text-card-foreground font-semibold border-input hover:bg-muted hover:text-black shadow-sm"
              disabled={saving || !scheduleCourtId}
            >
              {saving ? 'Saving…' : 'Confirm offline booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ReservationDetailsDialog
      reservation={selectedReservation}
      open={Boolean(selectedReservation)}
      onOpenChange={(open) => !open && setSelectedReservation(null)}
      onApprove={(res) => reviewPayment(res, true)}
      onReject={(res, reason) => reviewPayment(res, false, reason)}
    />
  </div></PageMotion></AppLayout>;
}
