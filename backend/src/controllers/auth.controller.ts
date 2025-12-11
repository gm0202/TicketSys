import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/user.entity';
import { validateDto } from '../middlewares/validation.middleware';
import { SignupDto } from '../dto/auth/signup.dto';
import { LoginDto } from '../dto/auth/login.dto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

function signToken(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

class AuthController {
    public router = Router();
    private userRepo = AppDataSource.getRepository(User);

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/auth/signup', validateDto(SignupDto), this.signup.bind(this));
        this.router.post('/auth/login', validateDto(LoginDto), this.login.bind(this));
    }

    private async signup(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, email, password, role } = req.body as SignupDto;

            const existing = await this.userRepo.findOne({ where: { email } });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }

            const user = this.userRepo.create({ name, email, password, role });
            const saved = await this.userRepo.save(user);
            const token = signToken({ sub: saved.id, role: saved.role, email: saved.email });

            res.status(201).json({
                success: true,
                data: {
                    token,
                    user: { id: saved.id, name: saved.name, email: saved.email, role: saved.role },
                },
                message: 'Signup successful',
            });
        } catch (error) {
            next(error);
        }
    }

    private async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body as LoginDto;
            const user = await this.userRepo
                .createQueryBuilder('user')
                .addSelect('user.password')
                .where('user.email = :email', { email })
                .getOne();

            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const valid = await user.comparePassword(password);
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const token = signToken({ sub: user.id, role: user.role, email: user.email });
            res.json({
                success: true,
                data: {
                    token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role },
                },
                message: 'Login successful',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();

