import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Show } from '../models/show.entity';
import { Booking } from '../models/booking.entity';
import { Seat } from '../models/seat.entity';
import { User } from '../models/user.entity';

config();

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    entities: [Show, Booking, Seat, User],
    synchronize: true, // Ensure tables are created in production for this demo
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Optional: immediately test connection
(async () => {
    try {
        await AppDataSource.initialize();
        console.log('✅ PostgreSQL connected successfully');

        await AppDataSource.synchronize();
        console.log('✅ Database schema synchronized!');
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(error);
    }
})();
