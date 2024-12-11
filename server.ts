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

const corsOptions = {
    origin: [
        'https://account.machinename.dev',
        'https://idea.machinename.dev',
        'https://login.machinename.dev',
        'https://machinename.dev',
        'https://www.machinename.dev',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use((req: Request, res: Response, next: Function) => {
    console.log(`Request method: ${req.method}, URL: ${req.url}`);
    next();
});

app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Machine Name Auth</h1>');
});

app.post('/login', async (req: Request, res: Response): Promise<void> => {
    const idToken = req.body.idToken;
    if (!idToken) {
        res.status(400).json({ message: 'ID Token Required' });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (!decodedToken) {
            res.status(401).json({ message: 'Unauthorized' });
            return; 
        }
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn: 60 * 60 * 24 * 5 * 1000 });
        res.cookie('session', sessionCookie, {
            domain: 'machinename.dev',
            maxAge: 60 * 60 * 24 * 5 * 1000,  // 5 days
            httpOnly: true, 
            secure: true,  
        });
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        const errorMessage = (error as Error).message;
        res.status(401).json({ message: 'Unauthorized', error: 'Invalid token or session creation failure' });
        console.error('Error Verifying ID Token:', error);
    }
});

app.post('/logout', (req: Request, res: Response): void => {
    res.clearCookie('session');
    res.status(200).json({ message: 'Logout successful' });
});

app.post('/verify', async (req: Request, res: Response): Promise<void> => {
    const sessionCookie = req.cookies.session;
    if (!sessionCookie) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        res.status(200).json({ message: 'Session Verified', decodedClaims });
    } catch (error) {
        const errorMessage = (error as Error).message;
        res.status(401).json({ message: 'Unauthorized', error: errorMessage });
        console.error('Error Verifying Session Cookie:', error);
    }
});

const server = app.listen(port, () => {
    console.log(`Server Is Running On Port ${port}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM Signal Received. Closing HTTP Server.');
    server.close(() => {
        console.log('HTTP Server Closed.');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT Signal Received. Closing HTTP Server.');
    server.close(() => {
        console.log('HTTP Server Closed.');
    });
});