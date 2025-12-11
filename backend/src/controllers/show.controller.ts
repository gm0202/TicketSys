import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Show } from '../models/show.entity';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateShowDto } from '../dto/create-show.dto';
import { MoreThan } from 'typeorm';
import { BookingStatus } from '../models/booking.entity';

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

    private async getAllShows(req: Request, res: Response, next: NextFunction) {
        try {
            const qb = this.showRepository
                .createQueryBuilder('show')
                .leftJoin('show.bookings', 'booking', 'booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
                .addSelect('show.totalSeats - COALESCE(SUM(booking.numSeats), 0)', 'show_availableSeats')
                .where('show.startTime > NOW()')
                .orderBy('show.startTime', 'ASC')
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
                .leftJoin('show.bookings', 'booking', 'booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
                .addSelect('show.totalSeats - COALESCE(SUM(booking.numSeats), 0)', 'show_availableSeats')
                .where('show.id = :id', { id: showId })
                .groupBy('show.id');
            const { entities, raw } = await qb.getRawAndEntities();
            const show = entities[0];
            const availableSeats = parseInt(raw[0]?.show_availableSeats ?? show?.totalSeats ?? 0, 10);
            
            if (!show) {
                return res.status(404).json({ success: false, message: 'Show not found' });
            }

            // Load confirmed bookings for seat map
            const confirmedBookings = await this.showRepository
                .createQueryBuilder('show')
                .leftJoinAndSelect('show.bookings', 'booking')
                .where('show.id = :id', { id: showId })
                .andWhere('booking.status = :status', { status: BookingStatus.CONFIRMED })
                .getOne();
            
            res.json({ 
                success: true, 
                data: { 
                    ...show, 
                    availableSeats,
                    bookings: confirmedBookings?.bookings ?? []
                } 
            });
        } catch (error) {
            next(error);
        }
    }

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
            
            const errors = await validate(show);
            if (errors.length > 0) {
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
            // Check if show has any bookings
            const showId = parseInt(req.params.id, 10);
            const show = await this.showRepository.findOne({
                where: { id: showId },
                relations: ['bookings']
            });

            if (!show) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Show not found' 
                });
            }

            if (show.bookings && show.bookings.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete show with existing bookings'
                });
            }

            const result = await this.showRepository.delete(showId);
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
