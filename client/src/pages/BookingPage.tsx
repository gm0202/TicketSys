import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useShowContext } from '../context/ShowContext';
import { useShow } from '../hooks/useShows';
import type { BookingStatus, CreateBookingInput, Show } from '../types';
import { formatDate, formatTime } from '../utils/format';
import { SeatGrid } from '../components/SeatGrid';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';

function bookedSeats(show?: Show): Set<number> {
  if (!show) return new Set();

  // Prioritize explicit seat records
  if (show.seats?.length) {
    return new Set(show.seats.filter((s) => s.isBooked).map((s) => s.seatNumber));
  }

  // Fallback to sequential calculation for legacy data
  if (show.bookings?.length) {
    const confirmed = show.bookings.filter((b) => b.status === 'confirmed');
    const seatNumbers: number[] = [];
    confirmed.forEach((booking) => {
      const bookedCount = booking.numSeats || 0;
      const start = seatNumbers.length + 1;
      for (let i = 0; i < bookedCount; i += 1) {
        seatNumbers.push(start + i);
      }
    });
    return new Set(seatNumbers);
  }
  return new Set();
}

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: show, isLoading, error } = useShow(id);
  const { data: bookings } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => api.getBookingsByShow(id as string),
    enabled: Boolean(id),
  });


  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedSeats, toggleSeat, clearSelection, setSelectedShow, lastBooking, setLastBooking } =
    useShowContext();
  const seatsForShow = selectedSeats(id || '');

  const [customerName, setCustomerName] = useState('Guest User');
  const [customerEmail, setCustomerEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bookingMutation = useMutation({
    mutationFn: (payload: CreateBookingInput) => api.createBooking(payload),
    onSuccess: (booking) => {
      setLastBooking(booking);
      queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['show', id] });
    },
    onError: (err: Error) => setErrorMsg(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number | string) => api.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['show', id] });
    },
    onError: (err: Error) => alert(`Failed to cancel booking: ${err.message}`),
  });

  // Mutations removed as per request to remove confirm/cancel buttons

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!show || !id) return;
    if (!customerName || !customerEmail) {
      setErrorMsg('Provide name and email');
      return;
    }
    if (seatsForShow.length === 0) {
      setErrorMsg('Select at least one seat');
      return;
    }
    setErrorMsg(null);
    bookingMutation.mutate({
      showId: show.id,
      customerName,
      customerEmail,
      numSeats: seatsForShow.length,
      seatNumbers: seatsForShow,
    });
  };

  if (isLoading) {
    return <div className="page">Loading show…</div>;
  }
  if (error || !show) {
    return (
      <div className="page">
        <div className="status-pill failed">Could not load show</div>
      </div>
    );
  }

  const booked = bookedSeats(show);

  return (
    <div className="page" style={{ display: 'grid', gap: 16 }}>
      <div className="hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="label">Booking</div>
            <h1 style={{ margin: '4px 0 0' }}>{show.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {formatDate(show.startTime)} · {formatTime(show.startTime)}
            </p>
          </div>
          <div className="pill">Total seats: {show.totalSeats}</div>
        </div>
        {show.description && <p style={{ margin: '12px 0 0' }}>{show.description}</p>}
      </div>

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="section-title">
          <h2>Select seats</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="status-pill confirmed">Available</span>
            <span className="status-pill failed">Booked</span>
            <span className="status-pill pending">Selected</span>
          </div>
        </div>
        <SeatGrid
          total={show.totalSeats}
          booked={booked}
          selected={seatsForShow}
          onToggle={(seat) => {
            setSelectedShow(String(show.id));
            toggleSeat(show.id, seat);
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="muted">
            {seatsForShow.length} seat(s) selected · {show.totalSeats - booked.size} remaining
          </div>
          <button className="btn ghost" onClick={() => clearSelection(show.id)}>
            Clear selection
          </button>
        </div>
      </div>

      {user.role !== 'admin' && (
        <form className="card grid" style={{ gap: 12 }} onSubmit={handleSubmit}>
          <div className="section-title">
            <h2>Booking details</h2>
            {bookingMutation.isPending && <span className="badge">Booking…</span>}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <label className="grid" style={{ gap: 6 }}>
              <span className="label">Your name</span>
              <input
                className="input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </label>
            <label className="grid" style={{ gap: 6 }}>
              <span className="label">Email</span>
              <input
                className="input"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </label>
          </div>
          {errorMsg && <div className="status-pill failed">{errorMsg}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={bookingMutation.isPending}>
              Book {seatsForShow.length || ''} seat(s)
            </button>
            {/* Confirm/Cancel buttons removed as per request */}
          </div>
          {lastBooking && (
            <div className="callout" role="status">
              Booking #{lastBooking.id} • Seats: {lastBooking.numSeats}{' '}
              <BookingStatusBadge status={lastBooking.status as BookingStatus} />
            </div>
          )}
        </form>
      )}

      <div className="card">
        <div className="section-title">
          <h2>Recent confirmed bookings</h2>
          {!bookings?.length && <span className="badge">No confirmed bookings</span>}
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Seats</th>
              <th>Status</th>
              {user.role === 'admin' && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {bookings?.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.id}</td>
                <td>{booking.numSeats}</td>
                <td>
                  <BookingStatusBadge status={booking.status as BookingStatus} />
                </td>
                {user.role === 'admin' && (
                  <td>
                    <button
                      className="btn danger sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this booking?')) {
                          cancelMutation.mutate(booking.id);
                        }
                      }}
                      disabled={cancelMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!bookings?.length && (
              <tr>
                <td colSpan={3} className="muted">
                  Nothing yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

