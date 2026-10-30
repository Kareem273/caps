import { type FormEvent, useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Download, MapPin, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { apiAdmin, apiAdminForm, apiGet, apiMediaUrl, type ApiCourt, type ApiReservation } from '@/lib/yalla-api';
import { downloadCourtsReport } from '@/lib/report-export';
import { PageMotion } from '@/components/page-motion';

type CourtForm = {
  name: string;
  place: string;
  price: string;
  locationUrl: string;
  paymentPhone: string;
  sportType: string;
};

const normalizeSport = (type?: string) => {
  if (!type) return 'Soccer';
  const lower = type.toLowerCase();
  if (lower === 'soccer' || lower === 'football') return 'Soccer';
  if (lower === 'multipurpose') return 'Multipurpose';
  return type;
};

const sports = [
  { value: 'Soccer', label: 'ملعب كرة قدم (Football)' },
  { value: 'Multipurpose', label: 'ملعب متعدد (Multipurpose)' },
];

const emptyForm: CourtForm = {
  name: '',
  place: 'مجمع مدرسة السويدي الرياضي',
  price: '',
  locationUrl: 'https://maps.google.com/?q=30.0587,31.3260',
  paymentPhone: '+20 100 000 0000',
  sportType: 'Soccer',
};

export default function Courts() {
  const [courts, setCourts] = useState<ApiCourt[]>([]);
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<ApiCourt | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CourtForm>(emptyForm);
  const [editForm, setEditForm] = useState<CourtForm>(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);

  const load = () => {
    setError('');
    setLoading(true);
    Promise.all([apiGet<ApiCourt[]>('/courts'), apiGet<ApiReservation[]>('/reservations')])
      .then(([courtData, reservationData]) => {
        setCourts(courtData);
        setReservations(reservationData);
      })
      .catch(() => setError('Could not load courts from the API.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateForm = (field: keyof CourtForm, value: string) => setForm(current => ({ ...current, [field]: value }));
  const updateEditForm = (field: keyof CourtForm, value: string) => setEditForm(current => ({ ...current, [field]: value }));

  const openEditDialog = (court: ApiCourt) => {
    setEditingCourt(court);
    setEditForm({
      name: court.name,
      place: court.place,
      price: String(court.price),
      locationUrl: court.locationUrl || '',
      paymentPhone: court.paymentPhone || '',
      sportType: normalizeSport(court.sportType),
    });
    setEditImage(null);
    setError('');
    setEditOpen(true);
  };

  const createCourt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || !form.place.trim() || !form.paymentPhone.trim() || !form.locationUrl.trim() || !image || !Number.isFinite(price) || price <= 0) {
      setError('Enter all court details and select a court image.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      payload.append('place', form.place.trim());
      payload.append('price', price.toString());
      payload.append('locationUrl', form.locationUrl.trim());
      payload.append('paymentPhone', form.paymentPhone.trim());
      payload.append('sportType', form.sportType);
      payload.append('image', image);
      await apiAdminForm<ApiCourt>('/courts/image', payload);
      setCreateOpen(false);
      setForm(emptyForm);
      setImage(null);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the court.');
    } finally {
      setSaving(false);
    }
  };

  const saveEditedCourt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCourt) return;
    const price = Number(editForm.price);
    if (!editForm.name.trim() || !editForm.place.trim() || !editForm.paymentPhone.trim() || !editForm.locationUrl.trim() || !Number.isFinite(price) || price <= 0) {
      setError('Enter all court details correctly.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('name', editForm.name.trim());
      payload.append('place', editForm.place.trim());
      payload.append('price', price.toString());
      payload.append('locationUrl', editForm.locationUrl.trim());
      payload.append('paymentPhone', editForm.paymentPhone.trim());
      payload.append('sportType', editForm.sportType);
      if (editImage) {
        payload.append('image', editImage);
      }
      await apiAdminForm<ApiCourt>(`/courts/${editingCourt.id}`, payload, 'PUT');
      setEditOpen(false);
      setEditingCourt(null);
      setEditImage(null);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update court.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourt = async (court: ApiCourt) => {
    if (!window.confirm(`Are you sure you want to deactivate or delete "${court.name}"?`)) return;
    try {
      await apiAdmin(`/courts/${court.id}`, 'DELETE');
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete court.');
    }
  };

  return <AppLayout><PageMotion loading={loading}><div className="flex flex-col gap-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div><h1 className="text-3xl font-bold tracking-tight text-foreground">Courts Management</h1><p className="text-muted-foreground mt-1">Live courts and booking usage from Yalla Match.</p></div>
      <div className="flex gap-2">
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm" onClick={() => downloadCourtsReport(courts, reservations)} disabled={courts.length === 0}><Download className="mr-2 w-4 h-4" />Export Excel</Button>
        <Button variant="outline" className="bg-card hover:bg-muted text-card-foreground border border-input shadow-xs" onClick={() => setCreateOpen(true)}><Plus className="mr-2 w-4 h-4" />Add court</Button>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 w-4 h-4" />Refresh</Button>
      </div>
    </div>
    {error && <p className="text-sm text-destructive">{error}</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{courts.map(court => {
      const count = reservations.filter(reservation => reservation.courtId === court.id).length;
      return <Card key={court.id} className="overflow-hidden hover:border-primary/50 transition-colors">
        <img className="h-40 w-full object-cover bg-muted" src={apiMediaUrl(`/api/courts/${court.id}/image`)} alt={court.name} />
        <CardHeader className="pb-3 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{court.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{court.place}</CardDescription>
            </div>
            <Badge variant="success">
              {court.sportType === 'Soccer' || court.sportType === 'Football'
                ? 'ملعب كرة قدم'
                : court.sportType === 'Multipurpose'
                ? 'ملعب متعدد'
                : court.sportType}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Hourly rate</span><span className="block font-medium mt-1">EGP {court.price}</span></div>
            <div><span className="text-muted-foreground">Bookings</span><span className="block font-medium mt-1 flex items-center gap-1"><Users className="w-3 h-3 text-primary" />{count} bookings</span></div>
            <div className="col-span-2"><span className="text-muted-foreground">Payment phone</span><span className="block font-medium mt-1">{court.paymentPhone || '—'}</span></div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild><a href={`/reservations?court=${court.id}`}><Clock className="w-3 h-3 mr-1" />Schedule</a></Button>
            <Button variant="outline" size="sm" className="flex-1 border-primary/40 text-primary hover:bg-primary/5" onClick={() => openEditDialog(court)}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => void deleteCourt(court)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </CardContent>
      </Card>;
    })}</div>

    {/* Add Court Dialog */}
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add a court</DialogTitle><DialogDescription>The new court will be saved directly in the database.</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={createCourt}>
          <div className="grid gap-2"><Label htmlFor="court-name">Court name</Label><Input id="court-name" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" value={form.name} onChange={event => updateForm('name', event.target.value)} placeholder="مثال: ملعب مدرسة السويدي لكرة القدم" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="court-sport">Sport type</Label><Select value={normalizeSport(form.sportType)} onValueChange={value => updateForm('sportType', value)}>
                <SelectTrigger id="court-sport" className="bg-card text-card-foreground border-input font-medium hover:bg-zinc-50 [&>svg]:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border-input">
                  {sports.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select></div><div className="grid gap-2"><Label htmlFor="court-price">Hourly price (EGP)</Label><Input id="court-price" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" type="number" min="1" step="0.01" value={form.price} onChange={event => updateForm('price', event.target.value)} placeholder="250" /></div></div>
          <div className="grid gap-2"><Label htmlFor="court-place">Place / area</Label><Input id="court-place" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" value={form.place} onChange={event => updateForm('place', event.target.value)} placeholder="مجمع مدرسة السويدي الرياضي" /></div>
          <div className="grid gap-2"><Label htmlFor="court-location">Google Maps location link</Label><Input id="court-location" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" type="url" value={form.locationUrl} onChange={event => updateForm('locationUrl', event.target.value)} placeholder="https://maps.google.com/..." /></div>
          <div className="grid gap-2"><Label htmlFor="court-phone">Payment phone</Label><Input id="court-phone" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" value={form.paymentPhone} onChange={event => updateForm('paymentPhone', event.target.value)} placeholder="+20 10 0000 0000" /></div>
          <div className="grid gap-2"><Label htmlFor="court-image">Court image</Label><Input id="court-image" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500 file:bg-muted file:text-foreground file:font-semibold" type="file" accept="image/*" required onChange={event => setImage(event.target.files?.[0] || null)} /><p className="text-xs text-muted-foreground">An image is required for every new court.</p></div>
          <DialogFooter><Button type="button" variant="outline" className="bg-card text-card-foreground font-semibold border-input hover:bg-muted" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" className="bg-card text-card-foreground font-semibold border-input hover:bg-muted shadow-sm" disabled={saving}>{saving ? 'Saving…' : 'Add court'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Edit Court Dialog */}
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit court details (تعديل بيانات الملعب)</DialogTitle><DialogDescription>Update court information and image in the database.</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={saveEditedCourt}>
          <div className="grid gap-2"><Label htmlFor="edit-court-name">Court name</Label><Input id="edit-court-name" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" value={editForm.name} onChange={event => updateEditForm('name', event.target.value)} placeholder="مثال: ملعب مدرسة السويدي لكرة القدم" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="grid gap-2"><Label htmlFor="edit-court-sport">Sport type</Label><Select value={normalizeSport(editForm.sportType)} onValueChange={value => updateEditForm('sportType', value)}>
                <SelectTrigger id="edit-court-sport" className="bg-card text-card-foreground border-input font-medium hover:bg-zinc-50 [&>svg]:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border-input">
                  {sports.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select></div><div className="grid gap-2"><Label htmlFor="edit-court-price">Hourly price (EGP)</Label><Input id="edit-court-price" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" type="number" min="1" step="0.01" value={editForm.price} onChange={event => updateEditForm('price', event.target.value)} placeholder="250" /></div></div>
          <div className="grid gap-2"><Label htmlFor="edit-court-place">Place / area</Label><Input id="edit-court-place" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" value={editForm.place} onChange={event => updateEditForm('place', event.target.value)} placeholder="مجمع مدرسة السويدي الرياضي" /></div>
          <div className="grid gap-2"><Label htmlFor="edit-court-location">Google Maps location link</Label><Input id="edit-court-location" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" type="url" value={editForm.locationUrl} onChange={event => updateEditForm('locationUrl', event.target.value)} placeholder="https://maps.google.com/..." /></div>
          <div className="grid gap-2"><Label htmlFor="edit-court-phone">Payment phone</Label><Input id="edit-court-phone" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500" value={editForm.paymentPhone} onChange={event => updateEditForm('paymentPhone', event.target.value)} placeholder="+20 10 0000 0000" /></div>
          <div className="grid gap-2"><Label htmlFor="edit-court-image">New court image (optional)</Label><Input id="edit-court-image" className="bg-card text-card-foreground border-input font-medium placeholder:text-muted-foreground focus-visible:ring-emerald-500 file:bg-muted file:text-foreground file:font-semibold" type="file" accept="image/*" onChange={event => setEditImage(event.target.files?.[0] || null)} /><p className="text-xs text-muted-foreground">Leave empty to keep current court image.</p></div>
          <DialogFooter><Button type="button" variant="outline" className="bg-card text-card-foreground font-semibold border-input hover:bg-muted" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" className="bg-card text-card-foreground font-semibold border-input hover:bg-muted shadow-sm" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

  </div></PageMotion></AppLayout>;
}
