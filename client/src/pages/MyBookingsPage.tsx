import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { formatDate, formatTime } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export function MyBookingsPage() {
    const { user } = useAuth();

    // We need an endpoint to get bookings for the logged-in user. 
    // currently api.getPendingBookings is for admin. 
    // Let's assume we can use a similar endpoint or filter.
    // Wait, I need to check if we have an endpoint for "my bookings".
    // Looking at BookingService: getBookingsByShow (admin).
    // I probably need to add `getMyBookings` to the backend and client.

    // For NOW, I'll assume we might need to add it.
    // But let's check `api/client.ts` first.

    const { data: bookings, isLoading, error } = useQuery({
        queryKey: ['my-bookings', user.email],
        queryFn: async () => {
            if (!user.email) return [];
            return api.getMyBookings(user.email);
        },
        enabled: !!user.email
    });

    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading your bookings...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error loading bookings</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-text-primary mb-6">My Bookings</h1>

            {!bookings || bookings.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-lg border border-border">
                    <p className="text-text-secondary">You haven't made any bookings yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.filter(b => b.status === 'confirmed').map(booking => (
                        <div key={booking.id} className="bg-surface border border-border rounded-lg p-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-text-primary mb-1">{booking.show?.name}</h3>
                                <div className="text-sm text-text-secondary mb-2">
                                    {formatDate(booking.show?.startTime || '')} • {formatTime(booking.show?.startTime || '')}
                                </div>
                                <div className="text-sm">
                                    {booking.numSeats} seat(s) • ₹{Number(booking.totalAmount || 0).toFixed(2)}
                                </div>
                            </div>
                            <div className="text-right">
                                <BookingStatusBadge status={booking.status} />
                                <div className="text-xs text-text-secondary mt-2">ID: #{booking.id}</div>
                            </div>
                        </div>
                    ))}
                    {bookings.filter(b => b.status === 'confirmed').length === 0 && (
                        <div className="text-center py-12 bg-surface rounded-lg border border-border">
                            <p className="text-text-secondary">You haven't made any successful bookings yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
