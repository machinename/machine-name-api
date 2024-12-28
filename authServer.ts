import admin from 'firebase-admin';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import Joi from 'joi';
import winston from 'winston';
import serviceAccount from './serviceAccountKey.json';
import rateLimit from 'express-rate-limit';

const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Logger setup using Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

// CORS configuration
const corsOptions = {
    origin: [
        'https://machinename.dev',
        'https://api.machinename.dev',
        'https://login.machinename.dev',
        'https://www.machinename.dev',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
};

//
app.set('trust proxy', true);

// Create a rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Redis, Memcached, etc. See below.
});


app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(
    helmet.hsts({
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    })
);
// app.use(limiter);

// Middleware to log requests
app.use((req: Request, res: Response, next: Function) => {
    logger.info(`Request method: ${req.method}, URL: ${req.url}`);
    next();
});

// Validation schema
const idTokenSchema = Joi.object({
    idToken: Joi.string()
        .required()
        .min(1000)  // Minimum length, based on Firebase token size (you can adjust this based on actual token length)
        .max(2000)  // Maximum length, can be adjusted accordingly
        .pattern(/^[A-Za-z0-9\-._~\+\/]+=*$/)  // JWT characters allowed in the token
        .message('Invalid token format')  // Custom error message
});

app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Machine Name API</h1>');
});

app.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { error } = idTokenSchema.validate(req.body);
    if (error) {
        logger.error('Token Validation Error: ', error.details);
        res.status(400).json('INVALID TOKEN');
        return;
    }

    const idToken = req.body.idToken;
    const csrfToken = req.body.csrfToken;
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    try {
        // Guard against CSRF attacks.
        if (csrfToken !== req.cookies.csrfToken) {
            logger.error('CSRF Error: ', error);
            res.status(401).json({ message: 'UNAUTHORIZED REQUEST' });
            return;
        }

        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        res.cookie('MNSC', sessionCookie, {
            domain: '.machinename.dev',
            maxAge: expiresIn,
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        res.status(200).json({ message: 'SUCCESS' });
    } catch (error) {
        logger.error('Login Error: ', error);
        res.status(401).json({ message: 'UNAUTHORIZED REQUEST' });
    }
});

app.get('/verify', async (req, res) => {
    const sessionToken = req.cookies.MNSC || '';
    try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionToken, true);
        res.status(200).json(decodedClaims);
    } catch (error) {
        logger.error('Verify Error: ', error);
        res.status(401).json({ message: 'UNAUTHORIZED REQUEST' });
    }
});

app.get('/logout', async (req, res) => {
    try {
        const sessionCookie = req.cookies.MNSC || '';
        res.clearCookie('MNSC');
        if (!sessionCookie) {
            res.status(200).json({ message: 'LOGOUT SUCCESSFUL' });
            return;
        }

        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        admin.auth().revokeRefreshTokens(decodedClaims.sub);
        res.status(200).json({ message: 'LOGOUT SUCCESSFUL' });
    } catch (error) {
        logger.error('Logout Error', error);
        res.status(500).json({ message: 'SERVER ERROR' });
    }
});

app.post('/reset', async (req, res) => {
    try {
        const email = req.body.email;
        await admin.auth().generatePasswordResetLink(email);
        res.status(200).json({ message: 'RESET EMAIL SENT' });
    } catch (error) {
        logger.error('Reset Password Error: ', error);
        res.status(500).json({ message: 'SERVER ERROR' });
    }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start server
const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        logger.info('HTTP Server Closed.');
    });
});

process.on('SIGINT', () => {
    server.close(() => {
        logger.info('HTTP Server Closed.');
    });
});