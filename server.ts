import admin from 'firebase-admin';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import serviceAccount from './serviceAccountKey.json';

const app = express();
const port = process.env.PORT || 8080;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const corsOptions = {
    origin: [
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
    res.send('<h1>Machine Name API</h1>');
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
        const customToken = await admin.auth().createCustomToken(decodedToken.uid);
        res.cookie('SNMNCT', customToken, {
            domain: 'machinename.dev',
            maxAge: 60 * 60 * 1000 * 24 * 7, // 7 days
            // httpOnly: true, 
            secure: true,
            sameSite: 'none',
        });
        res.status(200).json({ message: 'Login successful'});
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized', error: 'Invalid token or session creation failure' });
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