import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api/client';
import type { CreateShowInput, Show } from '../types';

const initialFormDefault: CreateShowInput = {
  name: '',
  description: '',
  startTime: '',
  endTime: '',
  totalSeats: 40,
  price: 300,
};

interface ShowFormProps {
  initialData?: Show;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ShowForm({ initialData, onSuccess, onCancel }: ShowFormProps) {
  const [form, setForm] = useState<CreateShowInput>(initialFormDefault);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        description: initialData.description || '',
        startTime: initialData.startTime.slice(0, 16),
        endTime: initialData.endTime ? initialData.endTime.slice(0, 16) : '',
        totalSeats: Number(initialData.totalSeats),
        price: Number(initialData.price || 0),
      });
    }
  }, [initialData]);

  const mutation = useMutation({
    mutationFn: (payload: CreateShowInput) => {
      if (initialData) {
        return api.updateShow(initialData.id, payload);
      }
      return api.createShow(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      if (!initialData) {
        setForm(initialFormDefault);
      }
      setError(null);
      if (onSuccess) onSuccess();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime) {
      setError('Name, start time and end time are required');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setError('End time must be after start time');
      return;
    }
    mutation.mutate(form);
  };

  const isUpdate = Boolean(initialData);

  return (
    <div className="bg-surface border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">
          {isUpdate ? 'Update Show Details' : 'Create New Show'}
        </h2>
        {mutation.isPending && (
          <span className="text-xs font-medium text-primary uppercase tracking-wider animate-pulse">Saving...</span>
        )}
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
        <div className="col-span-1 md:col-span-2">
          <label className="label-premium">Show Name</label>
          <input
            className="input-premium"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. The Phantom of the Opera"
            required
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="label-premium">Description</label>
          <input
            className="input-premium"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional details about the event"
          />
        </div>

        <div>
          <label className="label-premium">Start Time</label>
          <input
            type="datetime-local"
            className="input-premium"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label-premium">End Time</label>
          <input
            type="datetime-local"
            className="input-premium"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="label-premium">Total Seats</label>
          <input
            type="number"
            min={1}
            className="input-premium"
            value={form.totalSeats}
            onChange={(e) => setForm((f) => ({ ...f, totalSeats: Number(e.target.value) }))}
            required
          />
        </div>

        <div>
          <label className="label-premium">Price (₹)</label>
          <input
            type="number"
            min={0}
            className="input-premium"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            required
          />
        </div>

        <div className="col-span-1 md:col-span-2 flex items-center gap-4 mt-2">
          <button className="btn-primary min-w-[120px]" type="submit" disabled={mutation.isPending}>
            {isUpdate ? 'Update Show' : 'Create Show'}
          </button>

          {isUpdate && onCancel && (
            <button className="btn-secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}

          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
      </form>
    </div>
  );
}
