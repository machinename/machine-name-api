import admin from 'firebase-admin';
// import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import winston from 'winston';
import serviceAccount from './serviceAccountKey.json';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import Project from './models/project';

const app = express();
const port = process.env.PORT || 8080;

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// Initialize Firestore database
export const firestore = admin.firestore();

// Logger setup using Winston
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://machinename.dev',
        'https://api.machinename.dev',
        'https://www.machinename.dev',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // credentials: true,
};

//
// app.set('trust proxy', true);

// Create a rate limiter
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
//     standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
//     legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
//     // store: ... , // Redis, Memcached, etc. See below.
// });

app.use(cors(corsOptions));
// app.use(cookieParser());
app.use(express.json());
app.use(
    helmet.hsts({
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    })
);
// app.use(limiter);
const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        res.status(401).json({ message: 'Unauthorized: No token provided' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.body.user = decodedToken; 
        next();
    } catch (error) {
        logger.error(`Error verifying Firebase token: ${error}`);
        res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

interface ProjectData {
    name: string;
    description?: string;
    starred?: boolean;
    models?: any[];
}

app.post('/projects', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {

        const project = JSON.parse(req.body.project);

        if (!project) {
            res.status(400).json({ message: 'Bad Request: Project data is required' });
            return;
        }

        if (!project.name) {
            res.status(400).json({ message: 'Bad Request: Project name is required' });
            return;
        }

        console.log(project);

        // Create project in Firestore under userId and projects sub-collection
        const userId = req.body.user.uid; // Get user ID from decoded token
        const newProjectRef = firestore.collection('users').doc(userId).collection('projects').doc(); // Generate unique project ID

        const newProject = new Project(
            newProjectRef.id.toString(),
            project.name,
            project.description,
            Date.now().toString(),
            project.starred,
            project.mlModels || []
        );

        await newProjectRef.create(JSON.parse(newProject.toJSON()));
        res.status(201).json({ message: 'Project created successfully'});
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Health check endpoint
app.get('/health', authenticate, (req: Request, res: Response) => {
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