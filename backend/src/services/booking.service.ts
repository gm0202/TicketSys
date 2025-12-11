import { AppDataSource } from '../config/database';
import { Booking, BookingStatus } from '../models/booking.entity';
import { Show } from '../models/show.entity';
import { Seat } from '../models/seat.entity';
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
        numSeats: number,
        seatNumbers: number[]
    ): Promise<Booking> {
        return withRetry<Booking>(async () => {
            return AppDataSource.transaction(async (transactionalEntityManager) => {
                if (numSeats !== seatNumbers.length) {
                    throw new Error('Number of seats does not match the count of seat numbers provided');
                }

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

                // 2. Check if specific seats are already booked
                // We need to check if ANY of the requested seats are already taken for this show
                const existingSeats = await transactionalEntityManager
                    .createQueryBuilder(Seat, 'seat')
                    .where('seat.showId = :showId', { showId: numericShowId })
                    .andWhere('seat.seatNumber IN (:...seatNumbers)', { seatNumbers })
                    .andWhere('seat.isBooked = :isBooked', { isBooked: true })
                    .getMany();

                if (existingSeats.length > 0) {
                    const takenSeats = existingSeats.map(s => s.seatNumber).join(', ');
                    throw new Error(`The following seats are already booked: ${takenSeats}`);
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
                booking.status = BookingStatus.PENDING; // Initially pending, waiting for confirmation logic removal? 
                // User asked to REMOVE confirm button, so maybe we should auto-confirm or leave as pending but auto-confirm later?
                // The prompt said "user shouldn't be able to confirm their own tickets remove this confirm ticket button completely"
                // It implied the user shouldn't confirm, but maybe the SYSTEM confirms?
                // OR maybe the booking just stays pending?
                // HOWEVER, if we remove the confirm button, how does it become confirmed?
                // Maybe the user implies "The user shouldn't confirm, it should just BE booked".
                // I'll stick to 'PENDING' for now as per the existing flow, but if I remove the confirm button, I might need to make it CONFIRMED immediately?
                // Let's re-read: "the user shouldn't be able to confirm their own tickets remove this confirm ticket button completly"
                // This usually implies an admin confirms, OR it's auto-confirmed payment, etc. 
                // But given this is a simple app, and the previous flow was "User clicks book -> User clicks confirm", maybe now "User clicks book -> DONE"?
                // If I leave it PENDING and remove the button, the user is stuck.
                // Re-reading: "the seats which the users have selected should get chosen exactly".
                // I will set it to CONFIRMED immediately to simplify, assuming "removal of confirm button" means "don't ask me to confirm again".
                // ERROR: The user said "user shouldn't be able to confirm their own tickets". This might mean Admin must confirm.
                // Let's look at `NavLinks`: there is an `Admin` link.
                // If I set it to `CONFIRMED`, that risks bypassing "approval".
                // BUT, typically "check confirm" is a user UX step.
                // Let's check `AdminApprovalsPage` or similar if it exists?
                // `c:\Users\91852\OneDrive\Desktop\Modex\Ticket-Booking-System\client\src\pages` has `AdminApprovalsPage.tsx`.
                // Aha! So the ADMIN should confirm.
                // So I should keep it PENDING.

                booking.totalAmount = Number(show.price || 0) * numSeats;
                const savedBooking = await transactionalEntityManager.save(booking);

                // 5. Create Seat records for the specific seats
                // We need to upsert seats. Since we checked for conflicts, we can safely create them.
                // Note: Seat table has unique constraint on (seatNumber, showId).
                // We need to handle if the seat row exists (but isBooked=false) or doesn't exist.
                // The query above checked `isBooked = true`.
                // So now we just need to "claim" these seats.

                for (const seatNum of seatNumbers) {
                    // Try to find existing seat record (unbooked) to update, or create new
                    let seat = await transactionalEntityManager.findOne(Seat, {
                        where: { showId: numericShowId, seatNumber: seatNum }
                    });

                    if (!seat) {
                        seat = new Seat();
                        seat.showId = numericShowId;
                        seat.seatNumber = seatNum;
                    }

                    seat.isBooked = true;
                    seat.booking = savedBooking;
                    await transactionalEntityManager.save(seat);
                }

                // Set a timeout to expire the booking if not confirmed (by admin now?)
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

                if (bookingToCancel.status !== BookingStatus.PENDING && bookingToCancel.status !== BookingStatus.CONFIRMED) {
                    throw new Error('Only pending or confirmed bookings can be cancelled');
                }

                // Release seats
                await transactionalEntityManager.update(Seat,
                    { bookingId: numericId },
                    { isBooked: false, bookingId: null }
                );

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
