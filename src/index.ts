import OpenAI from 'openai';
const logger = require('./logger'); 
require('dotenv').config();
const envvars = require('./envvars');
const authUtils = require('./authutils');
const jwt = require('jsonwebtoken');
import express, { Request, Response } from 'express';
import cors from 'cors';
const app = express();
const PORT = process.env.PORT || 5000;
const jwt_secret = envvars.getMandatoryEnvVar('JWT_SECRET');
const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));
import { LojoChat } from './models/LojoChat';

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });

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
        const payload = authUtils.getJwtPayload(username, 60);
        const token = jwt.sign(payload, jwt_secret);
        const userData = { username: user.username, firstname: user.firstname, lastname: user.lastname };
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

app.post('/api/chat/remark', authenticateToken, async (req: Request, res: Response) => {
    logger.debug("entered /api/chat/send route");
    const chat : LojoChat = req.body as LojoChat;
    const latestRemark = chat.remarks[chat.remarks.length - 1];
    const latestRemarkText =latestRemark.remark;
    const messageText = `Received message '${latestRemarkText}' and sending ack`;
    const responseJson = { message: messageText };
    const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ 
                    role: 'user',
                    content: latestRemarkText
                    }],
        stream: true,
        });
    for await (const chunk of stream) {
        process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    // Sleep for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    res.send(responseJson);
});

app.get('/api/health', authenticateToken, (req: Request, res: Response) => {
    logger.debug("entered /api/health route");
    res.send('healthy');
});

app.get('/api/user/details', authenticateToken, (req: Request, res: Response) => {
    logger.debug("entered /api/user/details route");
    const username = String(req.query.username);
    const user = localAccountsJson[username];
    const returnUser = { username: user.username, firstname: user.firstname, lastname: user.lastname };
    res.send(returnUser);
})

app.listen(PORT, () => {
    logger.info("server running on port ", PORT);
});

