import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useShowContext } from '../context/ShowContext';
import { useShow } from '../hooks/useShows';
import type { CreateBookingInput, Show } from '../types';
import { formatDate, formatTime } from '../utils/format';
import { SeatGrid } from '../components/SeatGrid';
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

function bookedSeats(show?: Show): Set<number> {
  if (!show) return new Set();
  if (show.seats?.length) {
    return new Set(show.seats.filter((s) => s.isBooked).map((s) => s.seatNumber));
  }
  if (show.bookings?.length) {
    // Include Confirmed AND Active Pending bookings
    const taken = show.bookings.filter((b) => {
      if (b.status === 'confirmed') return true;
      if (b.status === 'pending') {
        // Check expiry
        if (b.expiresAt && new Date(b.expiresAt) > new Date()) return true;
        return false;
      }
      return false;
    });

    const seatNumbers: number[] = [];
    taken.forEach((booking) => {
      // Now that we added seatNumbers to the entity, this should work if populated
      if (booking.seatNumbers && Array.isArray(booking.seatNumbers)) {
        // TypeORM simple-array returns strings sometimes? No, we typed it as number[] but it might be strings in runtime.
        booking.seatNumbers.forEach(s => seatNumbers.push(Number(s)));
      }
    });
    return new Set(seatNumbers);
  }
  return new Set();
}

function BookingSuccessCard({ booking, onClear }: { booking: import('../types').Booking; onClear: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!booking.expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(booking.expiresAt!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00');
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking.expiresAt]);

  if (isExpired) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-center">
        <div className="text-red-500 font-bold mb-1">Booking Expired</div>
        <div className="text-xs text-red-500/80 mb-2">You ran out of time. The seats have been released.</div>
        <button onClick={onClear} className="mt-4 text-xs font-bold text-red-500 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (booking.status === 'confirmed') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded p-4 text-center">
        <div className="text-green-500 font-bold mb-1">Booking Confirmed!</div>
        <div className="text-xs text-green-500/80 mb-2">Your seats have been successfully reserved.</div>
        <div className="text-xs text-green-500/60">ID: #{booking.id}</div>
        <button onClick={onClear} className="mt-4 text-xs font-bold text-green-500 hover:underline">
          Book Another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-4 text-center animate-pulse">
      <div className="text-yellow-500 font-bold mb-1">Booking Pending Approval</div>
      <div className="text-xs text-yellow-500/80 mb-2">Please wait for admin confirmation.</div>
      <div className="text-xl font-mono font-bold text-yellow-500 my-2">{timeLeft || '--:--'}</div>
      <div className="text-xs text-yellow-500/60">ID: #{booking.id}</div>
    </div>
  );
}

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: show, isLoading, error } = useShow(id);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedSeats, toggleSeat, clearSelection, setSelectedShow, lastBooking, setLastBooking } = useShowContext();

  // Fetch user's bookings to restore state and block new bookings
  const { data: myBookings } = useQuery({
    queryKey: ['my-bookings', user.email],
    queryFn: () => api.getMyBookings(user.email!),
    enabled: !!user.email,
    refetchInterval: 5000 // Poll every 5s to check for status updates
  });

  // Actually, we want to find if there is a PENDING booking.
  const pendingBooking = myBookings?.find(b =>
    b.showId === Number(id) &&
    b.status === 'pending' &&
    (b.expiresAt ? new Date(b.expiresAt) > new Date() : true)
  );

  // Also check if we have a recently confirmed booking that we want to show success for.
  // We can use `lastBooking` from context as a "recently actioned" marker, 
  // OR just show the latest booking if it's recent.
  // Le's rely on `pendingBooking` to block the form.

  // Helper to handle polling updates
  useEffect(() => {
    if (pendingBooking && !lastBooking) {
      setLastBooking(pendingBooking);
    }
    // If lastBooking was pending and now myBookings has it as confirmed, update lastBooking
    if (lastBooking && myBookings) {
      const updated = myBookings.find(b => b.id === lastBooking.id);
      if (updated && updated.status !== lastBooking.status) {
        setLastBooking(updated);
      }
      // If updated is missing (maybe expired/cancelled and filtered out?), handle that?
      // MyBookings should return all.
    }
  }, [pendingBooking, myBookings, lastBooking, setLastBooking]);

  const seatsForShow = selectedSeats(id || '');

  const [customerName, setCustomerName] = useState(user.name || '');
  const [customerEmail, setCustomerEmail] = useState(user.email || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const bookingMutation = useMutation({
    mutationFn: (payload: CreateBookingInput) => api.createBooking(payload),
    onSuccess: (booking) => {
      setLastBooking(booking);
      queryClient.invalidateQueries({ queryKey: ['bookings', id] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['show', id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] }); // Refresh my bookings
      clearSelection(id || '');
    },
    onError: (err: Error) => setErrorMsg(err.message),
  });

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
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-text-secondary text-sm font-medium uppercase tracking-widest">Loading Event...</div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
        Could not load show details.
      </div>
    );
  }

  const booked = bookedSeats(show);
  const totalCost = seatsForShow.length * (show.price || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* Left Column: Event Info & Seat Selection */}
      <div className="lg:col-span-8 space-y-8">
        <div>
          <div className="flex items-center gap-3 text-sm text-text-secondary mb-2 uppercase tracking-wide font-medium">
            <span>{formatDate(show.startTime)}</span>
            <span>•</span>
            <span>{formatTime(show.startTime)}</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-4">{show.name}</h1>
          {show.description && <p className="text-text-secondary">{show.description}</p>}
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">Select Seats</h2>
            <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-surface border border-border"></div>
                <span className="text-text-secondary">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary border border-primary"></div>
                <span className="text-text-primary">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-surface border border-border opacity-50"></div>
                <span className="text-text-secondary">Booked</span>
              </div>
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
        </div>
      </div>

      {/* Right Column: Booking Summary & Form */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 space-y-6">

          {/* Booking Form Card */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6">Booking Summary</h3>

            {seatsForShow.length > 0 ? (
              <div className="mb-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{seatsForShow.length} x Seat(s)</span>
                  <span className="text-text-primary font-medium">₹{totalCost.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-text-primary font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">₹{totalCost.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-background border border-border rounded text-sm text-text-secondary text-center">
                Select seats to proceed
              </div>
            )}

            {seatsForShow.length > 0 && !lastBooking ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-premium">Name</label>
                  <input
                    className="input-premium"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label-premium">Email</label>
                  <input
                    className="input-premium"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>

                {errorMsg && <div className="text-sm text-red-500">{errorMsg}</div>}

                <button className="btn-primary w-full py-3" type="submit" disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? 'Processing...' : 'Confirm Booking'}
                </button>

                <button type="button" onClick={() => clearSelection(show.id)} className="w-full text-xs text-text-secondary hover:text-text-primary pt-2">
                  Clear Selection
                </button>
              </form>
            ) : lastBooking ? null : (
              // If no seats selected and no last booking
              null
            )}

            {lastBooking && (
              <BookingSuccessCard booking={lastBooking} onClear={() => setLastBooking(undefined)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
