import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Booking, BookingStatus } from '../models/booking.entity';
import { bookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { validateDto } from '../middlewares/validation.middleware';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateBookingDto:
 *       type: object
 *       required:
 *         - showId
 *         - customerName
 *         - customerEmail
 *         - numSeats
 *         - seatNumbers
 *       properties:
 *         showId:
 *           type: integer
 *           description: ID of the show
 *         customerName:
 *           type: string
 *           description: Name of the customer
 *         customerEmail:
 *           type: string
 *           format: email
 *           description: Email of the customer
 *         numSeats:
 *           type: integer
 *           minimum: 1
 *           description: Number of seats
 *         seatNumbers:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of seat numbers
 */
class BookingController {
    public router = require('express').Router();
    private bookingRepository = AppDataSource.getRepository(Booking);

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/bookings', validateDto(CreateBookingDto), this.createBooking.bind(this));
        // Order matters: specific routes before param routes
        this.router.get('/bookings/pending', this.getPending.bind(this));
        this.router.get('/bookings/my', this.getMyBookings.bind(this));
        this.router.get('/bookings/show/:showId', this.getBookingsByShow.bind(this));
        this.router.get('/bookings/:id', this.getBookingById.bind(this));
        this.router.put('/bookings/:id/cancel', this.cancelBooking.bind(this));
        this.router.put('/bookings/:id/confirm', this.confirmBooking.bind(this));
    }

    /**
     * @swagger
     * /bookings:
     *   post:
     *     summary: Create a new booking
     *     tags: [Bookings]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateBookingDto'
     *     responses:
     *       201:
     *         description: Booking created successfully
     *       400:
     *         description: Validation error or invalid input
     *       404:
     *         description: Show not found
     *       409:
     *         description: Not enough seats available
     */
    private async createBooking(req: Request, res: Response, next: NextFunction) {
        try {
            // The validated DTO is already attached to req.body by the validation middleware
            const { showId, customerName, customerEmail, numSeats, seatNumbers } = req.body as CreateBookingDto;

            const booking = await bookingService.createBooking(
                showId,
                customerName,
                customerEmail,
                numSeats,
                seatNumbers
            );

            res.status(201).json({
                success: true,
                data: booking,
                message: 'Booking created. You have 2 minutes to confirm your booking.'
            });
        } catch (error: any) {
            const errorMessage = error?.message || 'An unknown error occurred';
            if (errorMessage.includes('not found') ||
                errorMessage.includes('already started') ||
                errorMessage.includes('Not enough seats') ||
                errorMessage.includes('already have a pending booking')) {
                return res.status(400).json({
                    success: false,
                    message: errorMessage
                });
            }
            next(error);
        }
    }

    /**
     * @swagger
     * /bookings/{id}:
     *   get:
     *     summary: Get booking by ID
     *     tags: [Bookings]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: Booking ID
     *     responses:
     *       200:
     *         description: Booking found
     *       404:
     *         description: Booking not found
     */
    private async getBookingById(req: Request, res: Response, next: NextFunction) {
        try {
            const booking = await bookingService.getBookingById(req.params.id);
            res.json({
                success: true,
                data: booking
            });
        } catch (error: any) {
            if (error?.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * @swagger
     * /bookings/{id}/cancel:
     *   put:
     *     summary: Cancel a booking
     *     tags: [Bookings]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: Booking ID
     *     responses:
     *       200:
     *         description: Booking cancelled successfully
     *       400:
     *         description: Cannot cancel booking
     *       404:
     *         description: Booking not found
     */
    private async cancelBooking(req: Request, res: Response, next: NextFunction) {
        try {
            const booking = await bookingService.cancelBooking(req.params.id);
            res.json({
                success: true,
                data: booking,
                message: 'Booking cancelled successfully'
            });
        } catch (error: any) {
            if (error?.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error?.message === 'Only pending bookings can be cancelled') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * @swagger
     * /bookings/{id}/confirm:
     *   put:
     *     summary: Confirm a booking
     *     tags: [Bookings]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *         required: true
     *         description: Booking ID
     *     responses:
     *       200:
     *         description: Booking confirmed successfully
     *       400:
     *         description: Cannot confirm booking
     *       404:
     *         description: Booking not found
     */
    private async confirmBooking(req: Request, res: Response, next: NextFunction) {
        try {
            const booking = await bookingService.confirmBooking(req.params.id);
            res.json({
                success: true,
                data: booking,
                message: 'Booking confirmed successfully'
            });
        } catch (error: any) {
            if (error?.message === 'Booking not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error?.message === 'Only pending bookings can be confirmed') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            next(error);
        }
    }

    /**
     * @swagger
     * /bookings/show/{showId}:
     *   get:
     *     summary: Get all bookings for a show
     *     tags: [Bookings]
     *     parameters:
     *       - in: path
     *         name: showId
     *         schema:
     *           type: string
     *         required: true
     *         description: Show ID
     *     responses:
     *       200:
     *         description: List of bookings
     */
    private async getBookingsByShow(req: Request, res: Response, next: NextFunction) {
        try {
            const bookings = await this.bookingRepository.find({
                where: {
                    showId: parseInt(req.params.showId, 10),
                    status: BookingStatus.CONFIRMED // Only return confirmed bookings
                },
                order: {
                    createdAt: 'DESC'
                },
                relations: ['user'],
                select: {
                    id: true,
                    numSeats: true,
                    status: true,
                    createdAt: true,
                    user: {
                        name: true,
                        email: true
                    }
                }
            });

            res.json({
                success: true,
                data: bookings
            });
        } catch (error: any) {
            next(error);
        }
    }

    private async getPending(req: Request, res: Response, next: NextFunction) {
        try {
            const bookings = await this.bookingRepository.find({
                where: { status: BookingStatus.PENDING },
                relations: ['show'],
                order: { createdAt: 'DESC' }
            });
            res.json({ success: true, data: bookings });
        } catch (error) {
            next(error);
        }
    }

    private async getMyBookings(req: Request, res: Response, next: NextFunction) {
        try {
            const email = req.query.email as string;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }
            const bookings = await bookingService.getUserBookings(email);
            res.json({ success: true, data: bookings });
        } catch (error) {
            next(error);
        }
    }
}

export const bookingController = new BookingController();
