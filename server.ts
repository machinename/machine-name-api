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
// const corsOptions = {
//     origin: [
//         'https://machinename.dev',
//         'https://account.machinename.dev',
//         'https://login.machinename.dev'
//     ],
//     methods: ['GET', 'POST'],
//     credentials: true,
// };

// app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Default route
app.get('/', (req: Request, res: Response) => {
    res.send('<h1>Machine Name Services</h1>');
});

// API to create a session cookie
app.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { idToken } = req.body;

    if (!idToken) {
        res.status(400).json({ message: 'ID Token is required' });
        return;
    }

    try {
        const expiresIn = 60 * 60 * 1000;
        const sessionCookie = await admin
            .auth()
            .createSessionCookie(idToken, { expiresIn });

        res.cookie('session', sessionCookie, {
            domain: '.machinename.dev',
            httpOnly: true,
            secure: true,
            maxAge: expiresIn,
            sameSite: 'none',
        });

        res.status(200).json({ message: 'Session created successfully' });
    } catch (error: any) {
        res.status(401).json({ message: 'Failed to create session', error: error.message });
    }
});

// API to verify session cookie
app.get('/verify', async (req: Request, res: Response): Promise<void> => {
    const sessionCookie = req.cookies.session;

    if (!sessionCookie) {
        res.status(401).json({ message: 'No session cookie found' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);

        // Generate a custom token for Firebase
        const customToken = await admin.auth().createCustomToken(decodedToken.uid);

        res.status(200).json({ message: 'Session verified', customToken });
    } catch (error: any) {
        res.status(401).json({ message: 'Invalid session', error: error.message });
    }
});

// API to clear session (logout)
app.post('/logout', (req: Request, res: Response): void => {
    res.clearCookie('session', { domain: '.machinename.dev' });
    res.status(200).json({ message: 'Logged out successfully' });
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
