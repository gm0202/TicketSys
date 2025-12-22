import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Show } from '../types';

export function useShows(all = false) {
  return useQuery<Show[]>({
    queryKey: ['shows', { all }],
    queryFn: () => api.getShows(all),
    staleTime: 60_000,
  });
}

export function useShow(id?: string) {
  return useQuery<Show>({
    queryKey: ['show', id],
    queryFn: () => api.getShow(id as string),
    enabled: Boolean(id),
    staleTime: 0, // Always fetch fresh to get latest seat availability
    refetchInterval: 5000, // Poll every 5 seconds to update seat map
  });
}

