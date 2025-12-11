import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Booking, BookingStatus } from '../models/booking.entity';
import { bookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { validateDto } from '../middlewares/validation.middleware';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiParam,
    ApiBearerAuth
} from '@nestjs/swagger';

@ApiTags('Bookings')
@ApiBearerAuth()

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
        this.router.get('/bookings/show/:showId', this.getBookingsByShow.bind(this));
        this.router.get('/bookings/:id', this.getBookingById.bind(this));
        this.router.put('/bookings/:id/cancel', this.cancelBooking.bind(this));
        this.router.put('/bookings/:id/confirm', this.confirmBooking.bind(this));
    }

    @ApiOperation({ summary: 'Create a new booking' })
    @ApiResponse({ status: 201, description: 'Booking created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error or invalid input' })
    @ApiResponse({ status: 404, description: 'Show not found' })
    @ApiResponse({ status: 409, description: 'Not enough seats available' })
    @ApiBody({
        type: CreateBookingDto,
        description: 'Booking details',
        examples: {
            valid: {
                summary: 'A valid booking example',
                value: {
                    showId: '550e8400-e29b-41d4-a716-446655440000',
                    customerName: 'John Doe',
                    customerEmail: 'john@example.com',
                    numSeats: 2
                }
            }
        }
    })
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

    @ApiOperation({ summary: 'Get booking by ID' })
    @ApiParam({ name: 'id', description: 'Booking ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ status: 200, description: 'Booking found' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
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

    @ApiOperation({ summary: 'Cancel a booking' })
    @ApiParam({ name: 'id', description: 'Booking ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
    @ApiResponse({ status: 400, description: 'Cannot cancel booking' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
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

    @ApiOperation({ summary: 'Confirm a booking' })
    @ApiParam({ name: 'id', description: 'Booking ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ status: 200, description: 'Booking confirmed successfully' })
    @ApiResponse({ status: 400, description: 'Cannot confirm booking' })
    @ApiResponse({ status: 404, description: 'Booking not found' })
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

    @ApiOperation({ summary: 'Get all bookings for a show' })
    @ApiParam({ name: 'showId', description: 'Show ID', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiResponse({ status: 200, description: 'List of bookings' })
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
}

export const bookingController = new BookingController();
