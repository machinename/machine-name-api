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
        return;
    }
    try {
        const isVerified = await admin.auth().verifyIdToken(idToken);
        if (!isVerified) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const customToken = await admin.auth().createCustomToken(isVerified.uid);
        res.cookie('MNFBCT', customToken, {
            domain: '.machinename.dev',
            maxAge: 60 * 1000 * 2, // 2 Minute
            // maxAge: 60 * 60 * 1000, // 1 Hour
            // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
            // httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        const errorMessage = (error as Error).message;
        res.status(401).json({ message: 'Unauthorized', error: errorMessage });
        console.error('Error Verifying ID Token:', error);
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