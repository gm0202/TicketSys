import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { AppDataSource } from './config/database';
import { errorHandler } from './middlewares/error.middleware';

declare module 'express-serve-static-core' {
    interface Request {
        user?: any; // Add your user type here if needed
    }
}

interface Controller {
    router: RequestHandler;
}

export class App {
    public app: Application;
    public port: number;

    constructor(controllers: Controller[], port: number) {
        this.app = express();
        this.port = port;

        this.initializeDatabase();
        this.initializeMiddlewares();
        this.initializeControllers(controllers);
        this.initializeErrorHandling();
    }

    private async initializeDatabase() {
        try {
            await AppDataSource.initialize();
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection error:', error);
            process.exit(1);
        }
    }

    private initializeMiddlewares() {
        this.app.use(cors({
            origin: [
                'https://ticket-booking-system-omega.vercel.app',
                'http://localhost:5173',
                'http://localhost:3000'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        this.app.use(json());
        this.app.use(urlencoded({ extended: true }));

        // Add validation middleware
        this.app.use((req, res, next) => {
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                // This is a simplified validation middleware
                // In a real app, you'd want to map routes to DTOs
                next();
            } else {
                next();
            }
        });
    }

    private initializeControllers(controllers: Controller[]) {
        try {
            // Setup Swagger
            const options: swaggerJsdoc.Options = {
                definition: {
                    openapi: '3.0.0',
                    info: {
                        title: 'Ticket Booking API',
                        version: '1.0.0',
                        description: 'The Ticket Booking System API documentation',
                    },
                    servers: [
                        {
                            url: 'http://localhost:3000/api',
                            description: 'Development server',
                        },
                    ],
                    components: {
                        securitySchemes: {
                            bearerAuth: {
                                type: 'http',
                                scheme: 'bearer',
                                bearerFormat: 'JWT',
                            }
                        }
                    },
                    security: [{
                        bearerAuth: [] as string[]
                    }]
                },
                apis: ['./src/**/*.ts'],
            };

            const specs = swaggerJsdoc(options);
            this.app.use('/api-docs',
                swaggerUi.serve,
                swaggerUi.setup(specs, {
                    explorer: true,
                    customSiteTitle: 'Ticket Booking API Docs',
                })
            );

            this.app.get('/', (req, res) => {
                res.status(200).send('Ticket Booking System API is running 🚀');
            });

            // Setup API routes
            controllers.forEach((controller) => {
                this.app.use('/api', controller.router);
            });
        } catch (error) {
            console.error('Failed to initialize API documentation:', error);
        }
    }

    private initializeErrorHandling() {
        this.app.use(errorHandler);
    }

    public listen() {
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }
}

export default App;