export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed' | 'expired';

export interface Seat {
  id?: number;
  seatNumber: number;
  isBooked: boolean;
  bookingId?: number | null;
}

export interface Booking {
  id: number | string;
  showId: number | string;
  status: BookingStatus;
  totalAmount?: number;
  numSeats: number;
  customerName?: string;
  customerEmail?: string;
  seats?: Seat[];
  show?: Show; // Eager loaded in some responses
  createdAt?: string;
  updatedAt?: string;
}

export interface Show {
  id: number | string;
  name: string;
  description?: string | null;
  startTime: string;
  endTime?: string;
  totalSeats: number;
  price?: number;
  bookings?: Booking[];
  seats?: Seat[];
  availableSeats?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AuthUser {
  id: number | string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateShowInput {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  totalSeats: number;
  price: number;
}

export interface CreateBookingInput {
  showId: number | string;
  customerName: string;
  customerEmail: string;
  numSeats: number;
  seatNumbers: number[];
}

