import { useAuth } from '../context/AuthContext';
import { useShows } from '../hooks/useShows';
import { formatDate, formatTime } from '../utils/format';
import { ShowForm } from '../components/ShowForm';
import { useState } from 'react';
import type { Show } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export function AdminShowsPage() {
    const { user } = useAuth();
    const { data, isLoading, error } = useShows(true);
    const [editingShow, setEditingShow] = useState<Show | null>(null);
    const queryClient = useQueryClient();

    const blocked = user.role !== 'admin';

    const deleteMutation = useMutation({
        mutationFn: api.deleteShow,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shows'] });
        },
        onError: (err: Error) => {
            alert(`Failed to delete show: ${err.message}`);
        }
    });

    const handleDelete = (id: string | number) => {
        if (confirm('Are you sure you want to delete this show? This cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    if (blocked) {
        return (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg">
                Admin access required.
            </div>
        );
    }

    return (
        <>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-text-primary">Active Shows</h1>
                <p className="text-text-secondary mt-1">View and manage existing exhibitions.</p>
            </div>

            {/* Edit Modal Overlay */}
            {editingShow && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-background max-h-[90vh] overflow-y-auto w-full max-w-2xl rounded-lg shadow-xl border border-border">
                        <div className="p-6">
                            <ShowForm
                                initialData={editingShow}
                                onSuccess={() => setEditingShow(null)}
                                onCancel={() => setEditingShow(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg mb-4">
                    {(error as Error).message}
                </div>
            )}

            <div className="overflow-hidden border border-border rounded-lg">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-surface">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Seats</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                        {isLoading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-text-secondary animate-pulse">
                                    Loading shows...
                                </td>
                            </tr>
                        )}
                        {data?.map((show) => (
                            <tr key={show.id} className="hover:bg-surface/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Link
                                        to={`/admin/shows/${show.id}`}
                                        className="text-sm font-medium text-text-primary hover:text-primary transition-colors hover:underline"
                                    >
                                        {show.name}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {formatDate(show.startTime)} <span className="text-text-secondary/50 mx-1">·</span> {formatTime(show.startTime)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                    {show.totalSeats}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                                    ₹{show.price}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-3">
                                        <Link
                                            to={`/admin/shows/${show.id}`}
                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(show.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && !data?.length && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                                    No shows found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
