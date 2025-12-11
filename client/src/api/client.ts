import type {
  ApiResponse,
  Booking,
  CreateBookingInput,
  CreateShowInput,
  Show,
  AuthResponse,
  SignupInput,
  LoginInput,
} from '../types';

const DEFAULT_BASE = 'http://localhost:3000/api';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || DEFAULT_BASE;
const showPath = (import.meta.env.VITE_API_SHOWS_PATH as string | undefined) || '/shows';
const bookingPath = (import.meta.env.VITE_API_BOOKINGS_PATH as string | undefined) || '/bookings';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const text = await response.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!response.ok) {
    const message = json?.message || response.statusText || 'Request failed';
    throw new Error(message);
  }

  if (json && typeof json === 'object' && 'success' in json) {
    const body = json as ApiResponse<T>;
    if (!body.success) {
      throw new Error(body.message || 'Request failed');
    }
    return body.data;
  }

  return (json as T) ?? ({} as T);
}

function buildPath(base: string, suffix = ''): string {
  const normalized = base.startsWith('/') ? base : `/${base}`;
  if (!suffix) return normalized;
  return `${normalized}/${suffix}`.replace(/\/+/g, '/');
}

export const api = {
  getShows: () => request<Show[]>(buildPath(showPath)),
  getShow: (id: string | number) => request<Show>(buildPath(showPath, String(id))),
  createShow: (payload: CreateShowInput) =>
    request<Show>(buildPath(showPath), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteShow: (id: string | number) =>
    request<void>(buildPath(showPath, String(id)), { method: 'DELETE' }),

  updateShow: (id: string | number, payload: CreateShowInput) =>
    request<Show>(buildPath(showPath, String(id)), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createBooking: (payload: CreateBookingInput) =>
    request<Booking>(buildPath(bookingPath), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  confirmBooking: (id: string | number) =>
    request<Booking>(buildPath(bookingPath, `${id}/confirm`), { method: 'PUT' }),
  cancelBooking: (id: string | number) =>
    request<Booking>(buildPath(bookingPath, `${id}/cancel`), { method: 'PUT' }),
  getBookingsByShow: (showId: string | number) =>
    request<Booking[]>(buildPath(bookingPath, `show/${showId}`)),
  getPendingBookings: () => request<Booking[]>(buildPath(bookingPath, 'pending')),
  signup: (payload: SignupInput) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: LoginInput) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
};

