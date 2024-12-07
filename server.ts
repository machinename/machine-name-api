import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 8080;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

// CORS configuration to allow requests from the login domain
const corsOptions = {
    origin: [
        'https://machinename.dev',
        'https://www.machinename.dev',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Default route
app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Machine Name Services</h1>');
});

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Handle graceful shutdown of server
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server.');
    server.close(() => {
        console.log('HTTP server closed.');
    });
});
