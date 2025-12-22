import { DataSource } from "typeorm";
import { config } from "dotenv";
import { Show } from "../models/show.entity";
import { Booking } from "../models/booking.entity";
import { Seat } from "../models/seat.entity";
import { User } from "../models/user.entity";

config();

const isProduction = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource(
    isProduction
        ? {
            type: "postgres",
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            entities: [Show, Booking, Seat, User],
            synchronize: false,
            logging: false,
        }
        : {
            type: "postgres",
            host: process.env.DB_HOST || "localhost",
            port: parseInt(process.env.DB_PORT || "5432"),
            username: process.env.DB_USERNAME || "postgres",
            password: process.env.DB_PASSWORD || "postgres",
            database: process.env.DB_DATABASE || "ticket_booking",
            ssl: false,
            entities: [Show, Booking, Seat, User],
            synchronize: false,
            logging: true,
        }
);

// OPTIONAL connection test
AppDataSource.initialize()
    .then(() => {
        console.log("✅ PostgreSQL connected successfully");
    })
    .catch((err) => {
        console.error("❌ Database connection failed:");
        console.error(err);
    });
