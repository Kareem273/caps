import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lock, LockOpen, CalendarDays } from 'lucide-react';
import { apiAdmin, apiGet, ApiCourt } from '@/lib/yalla-api';

type Slot = { hour: number; status: 'Available' | 'Blocked' | 'Booked'; reservationId?: string; blockId?: string; expired?: boolean };
const formatHour = (hour: number) => `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

export default function TimeSlots() {
  const [courts, setCourts] = useState<ApiCourt[]>([]), [courtId, setCourtId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)), [slots, setSlots] = useState<Slot[]>([]), [reason, setReason] = useState(''), [error, setError] = useState('');
  useEffect(() => { apiGet<ApiCourt[]>('/courts').then(data => { setCourts(data); setCourtId(data[0]?.id || ''); }).catch(() => setError('Could not load courts.')); }, []);
  const load = () => { if (!courtId) return; setError(''); apiGet<Slot[]>(`/courts/${courtId}/slots?date=${date}`).then(setSlots).catch(() => setError('Could not load slots.')); };
  useEffect(load, [courtId, date]);
  const toggle = async (slot: Slot) => { if (!courtId || slot.status === 'Booked') return; try { if (slot.status === 'Blocked') await apiAdmin(`/admin/courts/${courtId}/slots/block?date=${date}&hour=${slot.hour}`, 'DELETE'); else await apiAdmin(`/admin/courts/${courtId}/slots/block`, 'POST', { date, fromHour: slot.hour, toHour: slot.hour, reason }); setReason(''); load(); } catch (e) { setError('The slot could not be updated.'); } };
  const selected = courts.find(c => c.id === courtId);
  return <AppLayout><div className="space-y-6"><div className="flex flex-col sm:flex-row justify-between gap-4"><div><h1 className="text-3xl font-bold">Time Slots</h1><p className="text-muted-foreground mt-1">Block or unblock court hours directly in the API.</p></div><Badge variant="destructive" className="h-fit self-start"><Lock className="w-3.5 h-3.5 mr-1"/>{slots.filter(s=>s.status==='Blocked').length} blocked</Badge></div><Card><CardContent className="p-4 grid sm:grid-cols-3 gap-4"><div><Label>Court</Label><Select value={courtId} onValueChange={setCourtId}><SelectTrigger className="mt-2"><SelectValue/></SelectTrigger><SelectContent>{courts.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Date</Label><Input className="mt-2" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div><Label>Block reason (optional)</Label><Input className="mt-2" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Maintenance"/></div></CardContent></Card>{error&&<p className="text-sm text-destructive">{error}</p>}<Card><CardHeader><CardTitle className="flex gap-2 items-center"><CalendarDays className="w-4 h-4 text-primary"/>{selected?.name || 'Court'} schedule</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{slots.map(slot => <button key={slot.hour} disabled={slot.status==='Booked'} onClick={()=>toggle(slot)} className={`rounded-xl border p-3 text-left ${slot.status==='Available'?'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50':slot.status==='Blocked'?'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50':'bg-muted/40 text-muted-foreground border-border/40 opacity-60 cursor-not-allowed'}`}><b className="text-sm">{formatHour(slot.hour)}</b><span className="block text-xs mt-1">{slot.status==='Booked'?'Booked':slot.status==='Blocked'?<><LockOpen className="inline w-3 h-3 mr-1"/>Click to unblock</>:<><Lock className="inline w-3 h-3 mr-1"/>Click to block</>}</span></button>)}</div></CardContent></Card></div></AppLayout>;
}
