const logger = require('./logger'); 
require('dotenv').config();
const envvars = require('./envvars');

const jwt = require('jsonwebtoken');
import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

const jwt_secret = envvars.getMandatoryEnvVar('JWT_SECRET');
const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));

app.use(cors());
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
    logger.debug("entered / route");
    res.send('Hello world, from typescript Node backend!')
});

app.post('/api/auth/signin', (req: Request, res: Response) => {
    logger.debug("entered /api/auth/signin route");
    logger.debug("req.body: ", req.body);
    const { username, password } = req.body;
    logger.debug("username, password: ", username, password);
    const user = localAccountsJson[username];
    logger.debug("user: ", user);
    if (user && user.password === password) {
        logger.debug("user and password match");
        const payload = { id: user.id };
        const token = jwt.sign(payload, jwt_secret, { expiresIn: '1h' });
        const userData = { username: user.id };
        res.send({ token: token, user: userData });
    } else {
        logger.debug("user and password do not match");
        res.status(401).send({ message: 'Invalid login' });
    }
    
});



function authenticateToken(req: Request, res: Response, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    logger.debug("token: ", token);
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, jwt_secret, (err:any, user:any) => {
        if (err) return res.sendStatus(403);
        next();
    });
}

app.get('/api/health', authenticateToken, (req: Request, res: Response) => {
    logger.debug("entered /api/health route");
    res.send('healthy');
});

app.listen(PORT, () => {
    logger.info("server running on port ", PORT);
});

