import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Show } from '../models/show.entity';
import { Seat } from '../models/seat.entity';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateShowDto } from '../dto/create-show.dto';

import { BookingStatus } from '../models/booking.entity';

/**
 * @swagger
 * components:
 *   schemas:
 *     Show:
 *       type: object
 *       required:
 *         - name
 *         - startTime
 *         - totalSeats
 *         - price
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the show
 *         name:
 *           type: string
 *           description: The name of the show/trip/doctor
 *         description:
 *           type: string
 *           description: Optional description
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: Start time
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: End time
 *         totalSeats:
 *           type: integer
 *           description: Total number of seats
 *         price:
 *           type: number
 *           description: Price per seat
 *         availableSeats:
 *           type: integer
 *           description: Calculated available seats
 */
class ShowController {
    public router = require('express').Router();
    private showRepository = AppDataSource.getRepository(Show);

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/shows', this.getAllShows.bind(this));
        this.router.get('/shows/:id', this.getShowById.bind(this));
        this.router.post('/shows', this.createShow.bind(this));
        this.router.put('/shows/:id', this.updateShow.bind(this));
        this.router.delete('/shows/:id', this.deleteShow.bind(this));
    }

    /**
     * @swagger
     * /shows:
     *   get:
     *     summary: Returns the list of all available shows
     *     tags: [Shows]
     *     responses:
     *       200:
     *         description: The list of shows
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Show'
     */
    private async getAllShows(req: Request, res: Response, next: NextFunction) {
        try {
            const qb = this.showRepository
                .createQueryBuilder('show')
                .leftJoin('show.bookings', 'booking',
                    '(booking.status = :confirmed OR (booking.status = :pending AND (booking.expiresAt IS NULL OR booking.expiresAt > NOW())))',
                    { confirmed: BookingStatus.CONFIRMED, pending: BookingStatus.PENDING })
                .addSelect('show.totalSeats - COALESCE(SUM(booking.numSeats), 0)', 'show_availableSeats');

            if (req.query.all !== 'true') {
                qb.where('show.startTime > NOW()');
            }

            qb.orderBy('show.startTime', 'ASC')
                .groupBy('show.id');

            const { entities, raw } = await qb.getRawAndEntities();
            const shows = entities.map((entity, idx) => {
                const availableSeats = parseInt(raw[idx]?.show_availableSeats ?? entity.totalSeats, 10);
                return { ...entity, availableSeats };
            });
            res.json({ success: true, data: shows });
        } catch (error) {
            next(error);
        }
    }

    private async getShowById(req: Request, res: Response, next: NextFunction) {
        try {
            const showId = parseInt(req.params.id, 10);
            const qb = this.showRepository
                .createQueryBuilder('show')
                .leftJoin('show.bookings', 'booking',
                    '(booking.status = :confirmed OR (booking.status = :pending AND (booking.expiresAt IS NULL OR booking.expiresAt > NOW())))',
                    { confirmed: BookingStatus.CONFIRMED, pending: BookingStatus.PENDING })
                .addSelect('show.totalSeats - COALESCE(SUM(booking.numSeats), 0)', 'show_availableSeats')
                .where('show.id = :id', { id: showId })
                .groupBy('show.id');
            const { entities, raw } = await qb.getRawAndEntities();
            const show = entities[0];
            const availableSeats = parseInt(raw[0]?.show_availableSeats ?? show?.totalSeats ?? 0, 10);

            if (!show) {
                return res.status(404).json({ success: false, message: 'Show not found' });
            }

            // Load bookings for seat map (include valid pending ones)
            const activeBookings = await this.showRepository
                .createQueryBuilder('show')
                .leftJoinAndSelect('show.bookings', 'booking')
                .where('show.id = :id', { id: showId })
                .andWhere('(booking.status = :confirmed OR (booking.status = :pending AND (booking.expiresAt IS NULL OR booking.expiresAt > NOW())))',
                    { confirmed: BookingStatus.CONFIRMED, pending: BookingStatus.PENDING })
                .getOne();

            // Load seats - we need to know if they are booked by an ACTIVE booking
            // The Seat entity has `isBooked`, but that might be stale if we don't clear it on expiry (we rely on booking status).
            // A better way is to load seats and check their booking status.
            const seats = await AppDataSource.getRepository(Seat).find({
                where: { showId },
                relations: ['booking']
            });

            res.json({
                success: true,
                data: {
                    ...show,
                    availableSeats,
                    bookings: activeBookings?.bookings ?? [],
                    seats: seats.map(s => {
                        // Check if seat is effectively booked
                        const isBooked = s.isBooked && s.booking && (
                            s.booking.status === BookingStatus.CONFIRMED ||
                            (s.booking.status === BookingStatus.PENDING && (!s.booking.expiresAt || new Date(s.booking.expiresAt) > new Date()))
                        );

                        return {
                            ...s,
                            isBooked: !!isBooked,
                            bookingId: isBooked ? s.bookingId : null
                        };
                    })
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /shows:
     *   post:
     *     summary: Create a new show
     *     tags: [Shows]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Show'
     *     responses:
     *       201:
     *         description: The show was created
     *       400:
     *         description: Validation error
     */
    private async createShow(req: Request, res: Response, next: NextFunction) {
        try {
            const showData = plainToInstance(CreateShowDto, req.body);
            const errors = await validate(showData);

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.map(e => e.constraints)
                });
            }

            const show = this.showRepository.create(showData);
            const result = await this.showRepository.save(show);
            res.status(201).json({
                success: true,
                data: result,
                message: 'Show created successfully'
            });
        } catch (error: any) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'A show with similar details already exists'
                });
            }
            next(error);
        }
    }

    private async updateShow(req: Request, res: Response, next: NextFunction) {
        try {
            const showId = parseInt(req.params.id, 10);
            const show = await this.showRepository.preload({
                id: showId,
                ...req.body
            });

            if (!show) {
                return res.status(404).json({
                    success: false,
                    message: 'Show not found'
                });
            }

            const showData = plainToInstance(CreateShowDto, req.body);
            const errors = await validate(showData);

            if (errors.length > 0) {
                console.error('Update Show Validation Errors:', JSON.stringify(errors, null, 2));
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.map(e => e.constraints)
                });
            }

            const updatedShow = await this.showRepository.save(show);
            res.json({
                success: true,
                data: updatedShow,
                message: 'Show updated successfully'
            });
        } catch (error: any) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    message: 'A show with similar details already exists'
                });
            }
            next(error);
        }
    }

    private async deleteShow(req: Request, res: Response, next: NextFunction) {
        try {
            // Cascading delete will handle bookings and seats
            const showId = parseInt(req.params.id, 10);
            const result = await this.showRepository.delete(showId);
            if (result.affected === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Show not found'
                });
            }

            res.json({
                success: true,
                message: 'Show deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

export const showController = new ShowController();
