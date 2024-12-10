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
        const verifiedIdToken = await admin.auth().verifyIdToken(idToken);
        const customToken = await admin.auth().createCustomToken(verifiedIdToken.uid);

        res.cookie('MNFBCT', customToken, {
            domain: '.machinename.dev',
            maxAge: 60 * 60 * 1000, 
            httpOnly: true,
            secure: true, 
            sameSite: 'none',
        });

        res.status(200).json({ message: 'Custom Token Created'});
    } catch (error) {
        console.error('Error Verifying ID Token:', error);
        const errorMessage = (error as Error).message;
        res.status(401).json({ message: 'Unauthorized', error: errorMessage });
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
