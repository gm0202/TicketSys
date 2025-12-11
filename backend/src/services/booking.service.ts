import { AppDataSource } from '../config/database';
import { Booking, BookingStatus } from '../models/booking.entity';
import { Show } from '../models/show.entity';
import { MoreThan } from 'typeorm';
import { withRetry } from '../utils/retry';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;
const BOOKING_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

export class BookingService {
    private parseId(id: string | number): number {
        const n = typeof id === 'string' ? parseInt(id, 10) : id;
        if (!Number.isFinite(n)) {
            throw new Error('Invalid booking id');
        }
        return n;
    }

    async getBookingById(id: string | number): Promise<Booking> {
        const numericId = this.parseId(id);
        const booking = await AppDataSource.getRepository(Booking).findOne({
            where: { id: numericId },
            relations: ['show']
        });
        
        if (!booking) {
            throw new Error('Booking not found');
        }
        
        return booking;
    }

    async createBooking(
        showId: string | number, 
        customerName: string, 
        customerEmail: string, 
        numSeats: number
    ): Promise<Booking> {
        return withRetry<Booking>(async () => {
            return AppDataSource.transaction(async (transactionalEntityManager) => {
            // 1. Lock the show row to prevent concurrent updates
            const numericShowId = typeof showId === 'string' ? parseInt(showId, 10) : showId;
            const show = await transactionalEntityManager
                .createQueryBuilder(Show, 'show')
                .setLock('pessimistic_write')
                .where('show.id = :showId AND show.startTime > NOW()', { showId: numericShowId })
                .getOne();

            if (!show) {
                throw new Error('Show not found or has already started');
            }

            // 2. Check seat availability
            const seatUsage = await transactionalEntityManager
                .createQueryBuilder(Booking, 'booking')
                .select('COALESCE(SUM(booking.numSeats), 0)', 'used')
                .where('booking.showId = :showId', { showId: numericShowId })
                .andWhere('booking.status IN (:...statuses)', { statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED] })
                .getRawOne<{ used: string }>();

            const usedSeats = Number(seatUsage?.used || 0);
            const availableSeats = show.totalSeats - usedSeats;

            if (availableSeats < numSeats) {
                throw new Error(`Not enough seats available. Only ${availableSeats} seats left.`);
            }

            // 3. Check for existing pending bookings for this email
            const existingBooking = await transactionalEntityManager.findOne(Booking, {
                where: {
                    customerEmail,
                    showId: numericShowId,
                    status: BookingStatus.PENDING,
                    createdAt: MoreThan(new Date(Date.now() - 2 * 60 * 1000)) // Last 2 minutes
                }
            });

            if (existingBooking) {
                throw new Error('You already have a pending booking for this show');
            }

            // 4. Create the booking
            const booking = new Booking();
            booking.showId = numericShowId;
            booking.customerName = customerName;
            booking.customerEmail = customerEmail;
            booking.numSeats = numSeats;
            booking.status = BookingStatus.PENDING;
            booking.totalAmount = Number(show.price || 0) * numSeats;
            const savedBooking = await transactionalEntityManager.save(booking);

            // Set a timeout to expire the booking if not confirmed
            setTimeout(() => {
                this.expireBooking(savedBooking.id).catch(error => {
                    console.error('Error expiring booking:', error);
                });
            }, BOOKING_EXPIRY_MS);

            return savedBooking;
            });
        }, MAX_RETRIES, RETRY_DELAY_MS);
    }

    async cancelBooking(id: string | number): Promise<Booking> {
        return withRetry<Booking>(async () => {
            return AppDataSource.transaction(async (transactionalEntityManager) => {
            const numericId = this.parseId(id);
                    const bookingToCancel = await transactionalEntityManager
                        .createQueryBuilder(Booking, 'booking')
                        .innerJoinAndSelect('booking.show', 'show')
                        .setLock('pessimistic_write')
                        .where('booking.id = :id', { id: numericId })
                        .getOne();

                    if (!bookingToCancel) {
                        throw new Error('Booking not found');
                    }

                    if (bookingToCancel.status !== BookingStatus.PENDING) {
                        throw new Error('Only pending bookings can be cancelled');
                    }

                    bookingToCancel.status = BookingStatus.CANCELLED;
                    return transactionalEntityManager.save(bookingToCancel);
            });
        }, MAX_RETRIES, RETRY_DELAY_MS);
    }

    async confirmBooking(id: string | number): Promise<Booking> {
        return withRetry<Booking>(async () => {
            return AppDataSource.transaction(async (transactionalEntityManager) => {
                try {
                    const numericId = this.parseId(id);
                    const booking = await transactionalEntityManager
                        .createQueryBuilder(Booking, 'booking')
                        .innerJoinAndSelect('booking.show', 'show')
                        .setLock('pessimistic_write')
                        .where('booking.id = :id', { id: numericId })
                        .getOne();

                    if (!booking) {
                        throw new Error('Booking not found');
                    }

                    if (booking.status !== BookingStatus.PENDING) {
                        throw new Error('Only pending bookings can be confirmed');
                    }

                    // Double-check seat availability (pending + confirmed)
                    const seatUsage = await transactionalEntityManager
                        .createQueryBuilder(Booking, 'booking')
                        .select('COALESCE(SUM(booking.numSeats), 0)', 'used')
                        .where('booking.showId = :showId', { showId: booking.showId })
                        .andWhere('booking.status IN (:...statuses)', { statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED] })
                        .getRawOne<{ used: string }>();

                    const usedSeats = Number(seatUsage?.used || 0);
                    const availableSeats = booking.show.totalSeats - usedSeats;

                    if (availableSeats < booking.numSeats) {
                        throw new Error('Not enough seats available to confirm this booking');
                    }

                    booking.status = BookingStatus.CONFIRMED;
                    await transactionalEntityManager.save(booking);
                    return booking;
                } catch (error) {
                    console.error('Error confirming booking:', error);
                    throw error;
                }
            });
        }, MAX_RETRIES, RETRY_DELAY_MS);
    }

    private async expireBooking(bookingId: string | number): Promise<void> {
        return withRetry<void>(async () => {
            return AppDataSource.transaction(async (transactionalEntityManager) => {
                try {
                    const numericId = this.parseId(bookingId);
                    const booking = await transactionalEntityManager
                        .createQueryBuilder(Booking, 'booking')
                        .innerJoinAndSelect('booking.show', 'show')
                        .setLock('pessimistic_write')
                        .where('booking.id = :id', { id: numericId })
                        .getOne();

                    if (!booking) {
                        console.log(`Booking ${bookingId} not found for expiration`);
                        return;
                    }

                    if (booking.status === BookingStatus.PENDING) {
                        booking.status = BookingStatus.EXPIRED;
                        await transactionalEntityManager.save(booking);
                        console.log(`Booking ${bookingId} expired successfully`);
                    }
                } catch (error) {
                    console.error('Error expiring booking:', error);
                    throw error;
                }
            });
        }, MAX_RETRIES, RETRY_DELAY_MS);
    }
    
    async getBookingsByShow(showId: string | number): Promise<Booking[]> {
        try {
            const numericShowId = typeof showId === 'string' ? parseInt(showId, 10) : showId;
            return AppDataSource.getRepository(Booking).find({
                where: { 
                    showId: numericShowId,
                    status: BookingStatus.CONFIRMED
                },
                order: { 
                    createdAt: 'DESC' 
                },
                select: [
                    'id',
                    'customerName',
                    'numSeats',
                    'status',
                    'createdAt'
                ]
            });
        } catch (error) {
            console.error('Error getting bookings by show:', error);
            throw error;
        }
    }
}

export const bookingService = new BookingService();
