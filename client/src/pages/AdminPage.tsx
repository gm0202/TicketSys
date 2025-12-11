import { useAuth } from '../context/AuthContext';
import { useShows } from '../hooks/useShows';
import { formatDate, formatTime } from '../utils/format';
import { ShowForm } from '../components/ShowForm';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { Show } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function AdminPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useShows();
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

  return (
    <div className="page">
      <section className="hero" style={{ marginBottom: 16 }}>
        <h1>Admin dashboard</h1>
        <p>Create and manage shows/trips. Basic mock auth only.</p>
      </section>

      {blocked && (
        <div className="callout" style={{ marginBottom: 16 }}>
          Switch to the admin role from the top bar to add shows.
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editingShow && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <ShowForm
              initialData={editingShow}
              onSuccess={() => setEditingShow(null)}
              onCancel={() => setEditingShow(null)}
            />
          </div>
        </div>
      )}

      {!blocked && !editingShow && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Create show</h2>
            <Link to="/admin/approvals" className="btn secondary">
              Pending bookings
            </Link>
          </div>
          <ShowForm />
        </>
      )}

      <div className="card">
        <div className="section-title">
          <h2>Existing shows</h2>
          {isLoading && <span className="badge">Loading…</span>}
        </div>
        {error && (
          <div className="status-pill failed">
            {(error as Error).message || 'Could not load shows'}
          </div>
        )}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Starts</th>
              <th>Seats</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((show) => (
              <tr key={show.id}>
                <td>
                  <button
                    className="btn-link"
                    onClick={() => setEditingShow(show)}
                    style={{ background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                  >
                    {show.name}
                  </button>
                </td>
                <td>
                  {formatDate(show.startTime)} · {formatTime(show.startTime)}
                </td>
                <td>{show.totalSeats}</td>
                <td>{show.price ? `₹ ${Number(show.price).toFixed(2)}` : 'NA'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn sm secondary" onClick={() => setEditingShow(show)}>
                      Edit
                    </button>
                    <button
                      className="btn sm danger"
                      onClick={() => handleDelete(show.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !data?.length && (
              <tr>
                <td colSpan={5} className="muted">
                  No shows created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

