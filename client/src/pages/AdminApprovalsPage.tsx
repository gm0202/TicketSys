import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Booking } from '../types';
import { formatDate, formatTime } from '../utils/format';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { useState, useEffect } from 'react';

function Timer({ expiresAt }: { expiresAt?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('--:--');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={`font-mono text-xs font-medium ${isExpired ? 'text-red-400' : 'text-yellow-500'}`}>
      {timeLeft}
    </span>
  );
}

export function AdminApprovalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<Booking[]>({
    queryKey: ['pending-bookings'],
    queryFn: api.getPendingBookings,
    refetchInterval: 10_000,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string | number) => api.confirmBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string | number) => api.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
    },
  });

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Approvals</h1>
        <p className="text-text-secondary mt-1">Review pending booking requests.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg mb-6">
          {(error as Error).message}
        </div>
      )}

      <div className="overflow-hidden border border-border rounded-lg">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Show</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Seats</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Time Left</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {data?.map((b) => (
              <tr key={b.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-text-primary">{b.show?.name || 'Unknown Show'}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {b.show?.startTime ? (
                      <>
                        {formatDate(b.show.startTime)} • {formatTime(b.show.startTime)}
                      </>
                    ) : '—'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-text-primary">{b.customerName || 'N/A'}</div>
                  <div className="text-xs text-text-secondary">{b.customerEmail}</div>
                </td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  {b.numSeats}
                </td>
                <td className="px-6 py-4">
                  {b.status === 'pending' ? <Timer expiresAt={b.expiresAt} /> : '—'}
                </td>
                <td className="px-6 py-4">
                  <BookingStatusBadge status={b.status} />
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                      onClick={() => confirmMutation.mutate(b.id)}
                      disabled={confirmMutation.isPending}
                    >
                      Approve
                    </button>
                    <button
                      className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      onClick={() => cancelMutation.mutate(b.id)}
                      disabled={cancelMutation.isPending}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                  No pending approvals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
