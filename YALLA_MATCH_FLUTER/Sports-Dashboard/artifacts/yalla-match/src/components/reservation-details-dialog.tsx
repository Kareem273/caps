import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Check, X, Image as ImageIcon, Loader2, Phone, Calendar, Clock, MapPin, DollarSign, ZoomIn, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchProtectedMediaBlobUrl, type ApiReservation } from '@/lib/yalla-api';

interface ReservationDetailsDialogProps {
  reservation: ApiReservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (reservation: ApiReservation) => Promise<void> | void;
  onReject?: (reservation: ApiReservation, reason?: string) => Promise<void> | void;
}

const formatHour = (hour: number) => `${hour % 12 || 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;

export function ReservationDetailsDialog({
  reservation,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: ReservationDetailsDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('Payment could not be verified / لم يتم التحقق من التحويل');

  useEffect(() => {
    let active = true;
    let currentBlob: string | null = null;
    setIsRejecting(false);

    if (open && reservation?.paymentScreenshotUrl) {
      setLoadingImage(true);
      setImageError(null);
      setBlobUrl(null);

      fetchProtectedMediaBlobUrl(reservation.paymentScreenshotUrl)
        .then((url) => {
          if (!active) {
            URL.revokeObjectURL(url);
            return;
          }
          currentBlob = url;
          setBlobUrl(url);
        })
        .catch((err) => {
          if (active) {
            setImageError(err instanceof Error ? err.message : 'Could not load receipt');
          }
        })
        .finally(() => {
          if (active) setLoadingImage(false);
        });
    } else {
      setBlobUrl(null);
      setLoadingImage(false);
      setImageError(null);
    }

    return () => {
      active = false;
      if (currentBlob) {
        URL.revokeObjectURL(currentBlob);
      }
    };
  }, [open, reservation?.paymentScreenshotUrl]);

  if (!reservation) return null;

  const canReview =
    reservation.paymentStatus !== 'Approved' &&
    reservation.status !== 'Confirmed' &&
    reservation.status !== 'Cancelled' &&
    reservation.status !== 'Rejected';

  const isApproved =
    reservation.paymentStatus === 'Approved' || reservation.status === 'Confirmed';

  const handleApprove = async () => {
    if (!onApprove) return;
    setActionLoading(true);
    try {
      await onApprove(reservation);
      onOpenChange(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!onReject) return;
    setActionLoading(true);
    try {
      await onReject(reservation, rejectReason.trim() || 'Payment could not be verified.');
      setIsRejecting(false);
      onOpenChange(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 border border-white/10">
                  <AvatarFallback className="bg-emerald-600/20 text-emerald-400 font-semibold text-sm">
                    {(reservation.customerName || 'G').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    {reservation.customerName || 'Guest Walk-in'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                    Booking #{reservation.id.slice(0, 8)}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Badge
                  variant={
                    reservation.status === 'Confirmed'
                      ? 'success'
                      : reservation.status.includes('Pending') || reservation.status.includes('Awaiting')
                      ? 'warning'
                      : reservation.status === 'Cancelled'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="text-xs font-semibold"
                >
                  {reservation.status}
                </Badge>
                <Badge variant="outline" className="text-[11px] font-normal border-white/15 text-zinc-300">
                  Payment: {reservation.paymentStatus}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Booking Information Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-black/35 border border-white/10 text-sm">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[11px] text-zinc-400">Court</span>
                  <span className="font-semibold text-white">{reservation.courtName || 'Court'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[11px] text-zinc-400">Price</span>
                  <span className="font-semibold text-emerald-400">EGP {Number(reservation.price).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[11px] text-zinc-400">Date</span>
                  <span className="font-medium text-zinc-200">{reservation.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[11px] text-zinc-400">Time Slot</span>
                  <span className="font-medium text-zinc-200">
                    {formatHour(reservation.fromHour)} - {formatHour(reservation.toHour)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[11px] text-zinc-400">Phone</span>
                  {reservation.customerPhone ? (
                    <a
                      href={`tel:${reservation.customerPhone}`}
                      className="font-medium text-emerald-400 hover:underline"
                    >
                      {reservation.customerPhone}
                    </a>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  S
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-400">Source</span>
                  <span className="font-medium text-zinc-200">{reservation.source || 'Online'}</span>
                </div>
              </div>
            </div>

            {/* Rejection notice if present */}
            {reservation.rejectionReason && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Rejection reason:</span>
                  {reservation.rejectionReason}
                </div>
              </div>
            )}

            {/* Payment Receipt / Screenshot Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Payment Receipt (إيصال الدفع)
                </label>
                {blobUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-zinc-300 hover:text-white hover:bg-white/10 px-2"
                    onClick={() => setIsZoomed(true)}
                  >
                    <ZoomIn className="w-3 h-3 mr-1" />
                    Enlarge image
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden min-h-[200px] flex items-center justify-center p-3 relative group">
                {loadingImage ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs">Loading payment receipt…</span>
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-zinc-400 px-4">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                    <span className="text-xs text-zinc-300">{imageError}</span>
                    {reservation.paymentScreenshotUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 text-xs bg-card text-card-foreground border-border hover:bg-muted"
                        onClick={() => {
                          setLoadingImage(true);
                          setImageError(null);
                          fetchProtectedMediaBlobUrl(reservation.paymentScreenshotUrl!)
                            .then(setBlobUrl)
                            .catch(err => setImageError(err.message))
                            .finally(() => setLoadingImage(false));
                        }}
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                ) : blobUrl ? (
                  <div className="relative w-full flex flex-col items-center">
                    <img
                      src={blobUrl}
                      alt="Payment Receipt"
                      className="max-h-[320px] w-auto max-w-full rounded-lg object-contain shadow-2xl cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setIsZoomed(true)}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] text-zinc-400 hover:text-zinc-200"
                        onClick={() => {
                          const w = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                          if (!w) {
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.target = '_blank';
                            a.click();
                          }
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open in browser tab
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-zinc-500">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No payment receipt was uploaded for this booking.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer with Actions */}
          <DialogFooter className="p-4 bg-black/40 border-t border-white/10 flex flex-col gap-2">
            {isRejecting ? (
              <div className="w-full space-y-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-300">Reason for Rejecting Payment (سبب رفض الدفع):</span>
                  <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-white"
                    onClick={() => setIsRejecting(false)}
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['صورة غير واضحة', 'المبلغ غير مطابق', 'لم يصل التحويل', 'رقم عملية خاطئ'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 transition-colors border border-white/10"
                      onClick={() => setRejectReason(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <Input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="h-8 text-xs bg-black/60 border-white/20 text-white placeholder:text-zinc-500"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-card text-card-foreground border-border hover:bg-muted font-medium"
                    onClick={() => setIsRejecting(false)}
                    disabled={actionLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
                    onClick={handleConfirmReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5 mr-1" />
                    )}
                    Confirm Rejection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between gap-2">
                <div>
                  {isApproved && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canReview && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-card text-rose-500 font-semibold border-destructive/40 hover:bg-destructive/10 hover:text-rose-700 shadow-sm"
                        onClick={() => setIsRejecting(true)}
                        disabled={actionLoading}
                      >
                        <X className="w-4 h-4 mr-1 text-rose-600" />
                        Reject Payment
                      </Button>
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-1 text-white" />
                        )}
                        Approve Payment
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="bg-card text-card-foreground font-semibold border-input hover:bg-muted hover:text-black shadow-sm"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enlarged Image Lightbox */}
      {blobUrl && (
        <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
          <DialogContent className="sm:max-w-4xl p-2 bg-black/95 border border-white/20 flex flex-col items-center justify-center">
            <div className="relative max-h-[85vh] overflow-auto flex items-center justify-center p-2">
              <img
                src={blobUrl}
                alt="Enlarged Payment Receipt"
                className="max-h-[80vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
            <div className="w-full flex justify-end p-2 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                className="bg-card text-card-foreground font-semibold border-input hover:bg-muted text-xs h-8"
                onClick={() => setIsZoomed(false)}
              >
                Close Enlarge
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
