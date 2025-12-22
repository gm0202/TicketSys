import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { formatDate, formatTime } from '../utils/format';
import { BookingStatusBadge } from '../components/BookingStatusBadge';
import { useState } from 'react';
import { ShowForm } from '../components/ShowForm';
import type { Booking } from '../types';

export function AdminShowDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'bookings' | 'seats'>('bookings');
    const [selectedSeat, setSelectedSeat] = useState<{ seatNumber: number; booking?: Booking } | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch Show Details (including bookings and seats)
    const { data: show, isLoading, error } = useQuery({
        queryKey: ['show', id],
        queryFn: () => api.getShow(id!),
        enabled: !!id,
        staleTime: 0,
        refetchInterval: 5000 // Poll to see live updates
    });

    const cancelMutation = useMutation({
        mutationFn: api.cancelBooking,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['show', id] });
            setSelectedSeat(null);
        }
    });

    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading show details...</div>;
    if (error || !show) return <div className="p-8 text-center text-red-500">Error loading show details</div>;

    // Filter confirmed bookings for the list
    const confirmedBookings = show.bookings?.filter((b: any) => b.status === 'confirmed') || [];

    // Helper to find booking for a seat
    const getBookingForSeat = (seatNum: number) => {
        // First check explicit seat map from backend if available
        const seatRecord = show.seats?.find((s: any) => s.seatNumber === seatNum) as any;
        if (seatRecord?.isBooked && seatRecord.booking) return seatRecord.booking as Booking;

        // Fallback to checking bookings array
        return show.bookings?.find((b: any) =>
            (b.status === 'confirmed' || (b.status === 'pending' && (!b.expiresAt || new Date(b.expiresAt) > new Date()))) &&
            b.seatNumbers?.includes(seatNum)
        ) as Booking | undefined;
    };

    return (
        <div className="relative min-h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <button
                        onClick={() => navigate('/admin/shows')}
                        className="text-text-secondary hover:text-text-primary mb-2 flex items-center gap-2 text-sm"
                    >
                        ← Back to Shows
                    </button>
                    <h1 className="text-3xl font-bold text-text-primary">{show.name}</h1>
                    <div className="text-text-secondary mt-1 flex gap-4 text-sm">
                        <span>{formatDate(show.startTime)} • {formatTime(show.startTime)}</span>
                        <span>₹{show.price}</span>
                        <span>{show.availableSeats} / {show.totalSeats} seats available</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary"
                >
                    Edit Show Details
                </button>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-background w-full max-w-2xl rounded-lg shadow-xl border border-border p-6">
                        <ShowForm
                            initialData={show}
                            onSuccess={() => { setIsEditing(false); queryClient.invalidateQueries({ queryKey: ['show', id] }); }}
                            onCancel={() => setIsEditing(false)}
                        />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-border mb-6">
                <nav className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'bookings'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Bookings List
                    </button>
                    <button
                        onClick={() => setActiveTab('seats')}
                        className={`pb-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'seats'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Seat Map Inspection
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'bookings' ? (
                <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Seats</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {confirmedBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                                        No confirmed bookings yet.
                                    </td>
                                </tr>
                            ) : (
                                confirmedBookings.map((booking: any) => (
                                    <tr key={booking.id} className="hover:bg-background/50">
                                        <td className="px-6 py-4 text-sm text-text-secondary">#{booking.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-text-primary">{booking.customerName}</div>
                                            <div className="text-xs text-text-secondary">{booking.customerEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                            {booking.numSeats} ({booking.seatNumbers?.join(', ') || 'N/A'})
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-primary">
                                            ₹{Number(booking.totalAmount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to cancel this booking?')) {
                                                        cancelMutation.mutate(booking.id);
                                                    }
                                                }}
                                                className="text-red-400 hover:text-red-300 text-sm font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex gap-8">
                    {/* Seat Grid */}
                    <div className="flex-1 bg-surface border border-border rounded-lg p-8">
                        <div className="grid grid-cols-8 gap-4 w-fit mx-auto">
                            {Array.from({ length: show.totalSeats }).map((_, i) => {
                                const seatNum = i + 1;
                                const booking = getBookingForSeat(seatNum);
                                const isBooked = !!booking;
                                const isSelected = selectedSeat?.seatNumber === seatNum;

                                return (
                                    <button
                                        key={seatNum}
                                        onClick={() => {
                                            if (isBooked) {
                                                setSelectedSeat({ seatNumber: seatNum, booking });
                                            } else {
                                                setSelectedSeat({ seatNumber: seatNum });
                                            }
                                        }}
                                        className={`
                                            w-12 h-12 rounded-md text-sm font-medium transition-all duration-200
                                            flex items-center justify-center relative
                                            ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}
                                            ${isBooked
                                                ? 'bg-indigo-900/40 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-900/60 cursor-pointer'
                                                : 'bg-background border border-border text-text-secondary hover:border-text-secondary/50'
                                            }
                                        `}
                                    >
                                        {seatNum}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-8 flex justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-background border border-border"></div>
                                <span className="text-text-secondary">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-indigo-900/40 border border-indigo-500/30"></div>
                                <span className="text-text-secondary">Booked / Pending</span>
                            </div>
                        </div>
                    </div>

                    {/* Side Panel (Inspector) */}
                    <div className="w-80 bg-surface border border-border rounded-lg p-6 h-fit sticky top-4">
                        <h3 className="text-lg font-bold text-text-primary mb-4">Seat Inspector</h3>
                        {selectedSeat ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                                <div className="p-4 bg-background rounded-md border border-border">
                                    <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">Seat Number</div>
                                    <div className="text-2xl font-bold text-primary">{selectedSeat.seatNumber}</div>
                                </div>

                                {selectedSeat.booking ? (
                                    <>
                                        <div>
                                            <div className="text-xs text-text-secondary uppercase tracking-wider mb-2">Status</div>
                                            <BookingStatusBadge status={selectedSeat.booking.status} />
                                        </div>
                                        <div>
                                            <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">Customer</div>
                                            <div className="text-text-primary font-medium">{selectedSeat.booking.customerName}</div>
                                            <div className="text-text-secondary text-sm">{selectedSeat.booking.customerEmail}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">Booking ID</div>
                                            <div className="text-text-primary text-sm font-mono">#{selectedSeat.booking.id}</div>
                                        </div>
                                        <div className="pt-4 border-t border-border mt-4">
                                            <button
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to cancel this booking?')) {
                                                        cancelMutation.mutate(selectedSeat.booking!.id);
                                                    }
                                                }}
                                                className="w-full btn-secondary text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
                                            >
                                                Cancel Booking
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-text-secondary italic">
                                        This seat is currently available.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-text-secondary text-sm">
                                Select a seat from the map to view details.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
