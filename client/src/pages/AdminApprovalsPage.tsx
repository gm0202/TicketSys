import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Booking, BookingStatus } from '../types';
import { formatDate, formatTime } from '../utils/format';

export function AdminApprovalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<Booking[]>({
    queryKey: ['pending-bookings'],
    queryFn: api.getPendingBookings,
    refetchInterval: 10_000, // poll to stay fresh
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
    <div className="page">
      <div className="hero" style={{ marginBottom: 16 }}>
        <h1>Pending bookings</h1>
        <p>Approve or reject pending bookings. Updates are polled every 10s.</p>
      </div>

      <div className="card">
        <div className="section-title">
          <h2>Requests</h2>
          {isLoading && <span className="badge">Loading…</span>}
          {confirmMutation.isPending && <span className="badge">Confirming…</span>}
          {cancelMutation.isPending && <span className="badge">Cancelling…</span>}
        </div>

        {error && <div className="status-pill failed">{(error as Error).message}</div>}

        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Show</th>
              <th>When</th>
              <th>Customer</th>
              <th>Seats</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.show?.name}</td>
                <td>
                  {b.show?.startTime ? (
                    <>
                      {formatDate(b.show.startTime)} · {formatTime(b.show.startTime)}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <div>{b.customerName || 'N/A'}</div>
                  <div className="muted">{b.customerEmail}</div>
                </td>
                <td>{b.numSeats}</td>
                <td>
                  <span className={`status-pill ${b.status}`}>{b.status.toUpperCase()}</span>
                </td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => confirmMutation.mutate(b.id)} disabled={confirmMutation.isPending}>
                    Approve
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => cancelMutation.mutate(b.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={7} className="muted">
                  No pending bookings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

